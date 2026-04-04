"""
Exam Lens Feature | Auto-Generate Practice Questions
Extracts concept-definition pairs and generates contextual MCQs.
Uses a single structured LLM call per question for quality and speed.
"""

import json
import logging
import random
import sys
from pathlib import Path
from typing import Dict, List, Optional

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from backend.config import settings
from backend.llm_utils import generate_chat, has_llm_configured

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
#  System prompt for MCQ generation
# ---------------------------------------------------------------------------
_MCQ_SYSTEM_PROMPT = """\
You are an expert exam question writer. Your task is to generate high-quality \
multiple-choice questions (MCQs) from academic/document content.

## RULES
1. The question must test understanding of the concept, not just rote memorization.
2. The correct answer must be DIRECTLY supported by the provided CONCEPT text.
3. All 3 distractors must be **plausible** — they should sound reasonable to someone \
who didn't study the material, but be factually incorrect based on the source.
4. Pull distractors from the DISTRACTOR SOURCE MATERIAL when provided — twist facts \
from those passages so the wrong answers feel realistic.
5. Each option should be roughly the same length (1-2 sentences).
6. Do NOT include "All of the above" or "None of the above" as options.

## OUTPUT FORMAT
Respond with ONLY valid JSON (no markdown fences, no explanation), exactly like this:
{
  "stem": "The question text here?",
  "correct": "The correct answer option text",
  "distractors": [
    "Plausible but wrong option 1",
    "Plausible but wrong option 2",
    "Plausible but wrong option 3"
  ]
}
"""


class ExamLens:
    """
    Pedagogical feature that auto-generates exam questions from documents.

    Algorithm:
    1. Select strategic concept chunks
    2. Generate a complete MCQ (stem + correct + 3 distractors) in ONE LLM call
    3. Parse the structured JSON response
    4. Shuffle options randomly
    """

    def __init__(self):
        """Initialize Exam Lens (uses generate_chat via backend.llm_utils)."""
        if not has_llm_configured():
            logger.warning(
                "Exam Lens: set OPENROUTER_API_KEY, GEMINI_API_KEY, or OPENAI_API_KEY"
            )
        logger.info("✅ Exam Lens initialized")

    def generate_questions(
        self,
        chunks: List[Dict],
        num_questions: int = 5,
        difficulty: str = "medium",
    ) -> List[Dict]:
        """
        Generate MCQ questions from document chunks.

        Args:
            chunks: List of document chunks
            num_questions: Number of questions to generate
            difficulty: "easy", "medium", or "hard"

        Returns:
            List of question dicts with stem, options, correct_index
        """
        logger.info(
            "Generating %d %s questions from %d chunks",
            num_questions, difficulty, len(chunks),
        )

        if not chunks:
            logger.warning("No chunks provided")
            return []

        questions = []

        # Select strategic chunks for question generation
        concept_chunks = [
            c
            for c in chunks
            if c.get("chunk_type") in ["Definition", "Concept", "General"]
        ]
        if not concept_chunks:
            concept_chunks = chunks[:num_questions]
        concept_chunks = concept_chunks[:num_questions]

        for i, concept_chunk in enumerate(concept_chunks):
            try:
                question = self._generate_single_question(
                    concept_chunk, chunks, difficulty
                )
                if question:
                    questions.append(question)
                    logger.info("Generated question %d/%d", i + 1, num_questions)
            except Exception as e:
                logger.warning("Failed to generate question for chunk %d: %s", i, e)
                continue

        logger.info("✅ Generated %d questions", len(questions))
        return questions

    def _generate_single_question(
        self,
        concept_chunk: Dict,
        all_chunks: List[Dict],
        difficulty: str,
    ) -> Optional[Dict]:
        """Generate a single MCQ question in one structured LLM call."""

        concept_text = concept_chunk["text"]

        # Gather distractor source material from other chunks
        other_chunks = [c for c in all_chunks if c != concept_chunk][:3]
        distractor_material = ""
        if other_chunks:
            distractor_parts = []
            for j, oc in enumerate(other_chunks, 1):
                distractor_parts.append(f"Passage {j}: {oc['text'][:300]}")
            distractor_material = "\n".join(distractor_parts)

        # Single structured prompt
        user_message = f"""Generate a {difficulty}-difficulty MCQ based on the concept below.

## CONCEPT (base the question and correct answer on this)
{concept_text}

## DISTRACTOR SOURCE MATERIAL (use these passages to craft plausible wrong answers)
{distractor_material if distractor_material else "(No additional passages available — invent plausible distractors that are clearly wrong based on the concept.)"}

Remember: respond with ONLY the JSON object, no markdown fences."""

        raw = generate_chat(
            system_prompt=_MCQ_SYSTEM_PROMPT,
            user_message=user_message,
            temperature=0.7,
            max_output_tokens=800,
        )

        if not raw:
            return None

        # Parse JSON response
        parsed = self._parse_mcq_json(raw)
        if not parsed:
            # Retry once with stricter instructions
            raw2 = generate_chat(
                system_prompt=_MCQ_SYSTEM_PROMPT,
                user_message=user_message + "\n\nIMPORTANT: Output ONLY raw JSON. No extra text.",
                temperature=0.5,
                max_output_tokens=800,
            )
            if raw2:
                parsed = self._parse_mcq_json(raw2)
            if not parsed:
                logger.warning("Failed to parse MCQ JSON after retry")
                return None

        stem = parsed["stem"]
        correct_option = parsed["correct"]
        distractors = parsed["distractors"][:3]

        # Pad if needed
        while len(distractors) < 3:
            distractors.append(
                f"A related but incorrect concept (placeholder {len(distractors) + 1})"
            )

        # Shuffle options
        options = [correct_option] + distractors
        correct_index = 0
        shuffled = list(zip(options, range(len(options))))
        random.shuffle(shuffled)
        options, indices = zip(*shuffled)
        correct_index = list(indices).index(0)
        options = list(options)

        return {
            "stem": stem,
            "options": options,
            "correct_index": correct_index,
            "source_chunk": concept_text[:200],
            "difficulty": difficulty,
            "explanation": f"The correct answer is '{options[correct_index]}' based on: {concept_text[:100]}...",
        }

    @staticmethod
    def _parse_mcq_json(raw: str) -> Optional[Dict]:
        """Parse LLM response as JSON, handling common formatting issues."""
        text = raw.strip()

        # Strip markdown code fences if present
        if text.startswith("```"):
            lines = text.split("\n")
            # Remove first line (```json or ```) and last line (```)
            lines = [l for l in lines if not l.strip().startswith("```")]
            text = "\n".join(lines).strip()

        try:
            data = json.loads(text)
        except json.JSONDecodeError:
            # Try to find JSON object in the response
            match = None
            brace_start = text.find("{")
            if brace_start >= 0:
                brace_count = 0
                for i in range(brace_start, len(text)):
                    if text[i] == "{":
                        brace_count += 1
                    elif text[i] == "}":
                        brace_count -= 1
                        if brace_count == 0:
                            match = text[brace_start : i + 1]
                            break
            if match:
                try:
                    data = json.loads(match)
                except json.JSONDecodeError:
                    return None
            else:
                return None

        # Validate required keys
        if (
            isinstance(data, dict)
            and "stem" in data
            and "correct" in data
            and "distractors" in data
            and isinstance(data["distractors"], list)
        ):
            return data
        return None


# Global instance
exam_lens = None


def get_exam_lens() -> ExamLens:
    """Lazy-load Exam Lens"""
    global exam_lens
    if exam_lens is None:
        exam_lens = ExamLens()
    return exam_lens
