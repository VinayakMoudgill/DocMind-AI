"""
Disagreement Detector | Cross-Document Conflict Flagging
Identifies entity inconsistencies across multiple documents
"""

import logging
from typing import List, Dict, Set, Tuple
from datetime import datetime
import re

try:
    import spacy
except ImportError:
    spacy = None  # optional; regex-only mode still works

logger = logging.getLogger(__name__)

class DisagreementDetector:
    """
    Analyzes multiple documents for conflicting entity values.

    Algorithm:
    1. Extract entities (names, dates, numbers, amounts)
    2. Normalize values (e.g., "2026-02-12" and "Feb 12, 2026" → same date)
    3. Compare values across documents
    4. Flag conflicts when values differ significantly
    """

    def __init__(self):
        """Initialize NER and pattern matching"""
        self.nlp = None
        if spacy is not None:
            try:
                self.nlp = spacy.load("en_core_web_sm")
            except Exception as e:
                logger.warning("spaCy model not found: %s. Using regex-only mode.", e)
        else:
            logger.warning("spaCy not installed. Using regex-only disagreement detection.")

        # Regex patterns for common entity types
        self.patterns = {
            "date": r"\d{4}-\d{2}-\d{2}|[A-Za-z]+ \d{1,2}, \d{4}",
            "currency": r"\$[\d,]+\.?\d*|USD [\d,]+",
            "percentage": r"\d+%",
            "numbers": r"\b\d+(?:,\d{3})*(?:\.\d+)?\b"
        }

        logger.info("✅ Disagreement Detector initialized")

    def extract_entities(self, text: str) -> Dict[str, List[str]]:
        """
        Extract entities from text using NER + regex.

        Args:
            text: Document text

        Returns:
            Dict mapping entity types to lists of values
        """

        entities = {}

        # Extract dates
        dates = re.findall(self.patterns["date"], text)
        if dates:
            entities["date"] = dates

        # Extract currency
        currency = re.findall(self.patterns["currency"], text)
        if currency:
            entities["currency"] = currency

        # Extract percentages
        percentages = re.findall(self.patterns["percentage"], text)
        if percentages:
            entities["percentage"] = percentages

        # NER (if available)
        if self.nlp:
            try:
                doc = self.nlp(text)

                for ent in doc.ents:
                    if ent.label_ not in entities:
                        entities[ent.label_] = []
                    entities[ent.label_].append(ent.text)

            except Exception as e:
                logger.warning(f"NER processing failed: {e}")

        return entities

    def normalize_value(self, entity_type: str, value: str) -> str:
        """
        Normalize entity values for comparison.

        Args:
            entity_type: Type of entity (date, currency, etc.)
            value: Raw value

        Returns:
            Normalized value
        """

        if entity_type == "date":
            # Try to parse and normalize date
            try:
                # Handle "2026-02-12" format
                if re.match(r"\d{4}-\d{2}-\d{2}", value):
                    return value

                # Handle "Feb 12, 2026" format
                from dateutil import parser
                parsed = parser.parse(value)
                return parsed.strftime("%Y-%m-%d")
            except:
                return value

        elif entity_type == "currency":
            # Strip $ and normalize
            value = re.sub(r"[^\d.-]", "", value)
            return value

        else:
            # Default: lowercase, strip whitespace
            return value.strip().lower()

    def analyze_conflicts(
        self,
        documents: List[Dict],
        min_conflicts: int = 1
    ) -> List[Dict]:
        """
        Analyze documents for entity conflicts.

        Args:
            documents: List of document dicts with 'text', 'id', 'filename'
            min_conflicts: Minimum occurrences to flag as conflict

        Returns:
            List of conflicts with document references
        """

        logger.info(f"Analyzing {len(documents)} documents for conflicts...")

        # Step 1: Collect ISO dates per document (cross-doc conflict signal)
        iso_pat = re.compile(r"\b(20\d{2}-\d{2}-\d{2})\b")
        per_doc: List[Dict] = []
        for doc in documents:
            doc_id = doc["id"]
            doc_text = doc["text"]
            filename = doc["filename"]
            dates = sorted(set(iso_pat.findall(doc_text)))
            if dates:
                per_doc.append(
                    {
                        "id": doc_id,
                        "filename": filename,
                        "dates": dates,
                        "text": doc_text,
                    }
                )

        conflicts: List[Dict] = []
        if len(per_doc) >= 2:
            for i in range(len(per_doc)):
                for j in range(i + 1, len(per_doc)):
                    a, b = per_doc[i], per_doc[j]
                    set_a, set_b = set(a["dates"]), set(b["dates"])
                    only_a = set_a - set_b
                    only_b = set_b - set_a
                    if only_a and only_b:
                        va, vb = sorted(only_a)[0], sorted(only_b)[0]
                        conflicts.append(
                            {
                                "entity_name": "Conflicting ISO dates across documents",
                                "entity_type": "date",
                                "occurrences": [
                                    {
                                        "document_id": a["id"],
                                        "filename": a["filename"],
                                        "page": None,
                                        "value": va,
                                        "normalized_value": va,
                                    },
                                    {
                                        "document_id": b["id"],
                                        "filename": b["filename"],
                                        "page": None,
                                        "value": vb,
                                        "normalized_value": vb,
                                    },
                                ],
                                "confidence": float(
                                    min(
                                        100,
                                        70
                                        + min(len(a["dates"]), len(b["dates"])) * 5,
                                    )
                                ),
                            }
                        )
                        break
                if conflicts:
                    break

        # Step 2: Currency / label-style conflicts (simple line-based)
        label_pat = re.compile(
            r"(?i)(projected\s+revenue|date\s+of\s+incident|start\s+date|effective\s+date)\s*[:=-]\s*([^\n]+)"
        )
        bucket: Dict[str, List[Dict]] = {}
        for doc in documents:
            for m in label_pat.finditer(doc["text"]):
                key = m.group(1).strip().lower()
                raw_val = m.group(2).strip()[:200]
                norm = raw_val.lower()
                bucket.setdefault(key, []).append(
                    {
                        "document_id": doc["id"],
                        "filename": doc["filename"],
                        "page": None,
                        "value": raw_val,
                        "normalized_value": norm,
                    }
                )
        for key, occs in bucket.items():
            norms = {o["normalized_value"] for o in occs}
            if len(norms) >= 2 and len(occs) >= min_conflicts:
                conflicts.append(
                    {
                        "entity_name": key.replace("_", " ").title(),
                        "entity_type": "other",
                        "occurrences": occs[:6],
                        "confidence": 88,
                    }
                )

        logger.info("Found %s conflicts", len(conflicts))
        return conflicts

    def format_conflict_report(self, conflicts: List[Dict]) -> str:
        """
        Format conflicts for display.

        Args:
            conflicts: List of conflict dicts

        Returns:
            Formatted report string
        """

        if not conflicts:
            return "✅ No conflicts detected across documents."

        report = f"⚠️ DISAGREEMENT DETECTED ({len(conflicts)} conflicts)\n\n"

        for conflict in conflicts:
            report += f"Entity: {conflict['entity_name']} ({conflict['entity_type']})\n"

            for occ in conflict['occurrences']:
                report += f"  • {occ['filename']} (Page {occ.get('page', '?')}): {occ.get('value', '')}\n"

            distinct = len({o.get('normalized_value', o.get('value', '')) for o in conflict['occurrences']})
            report += f"  ⚠️ {distinct} different values found\n\n"

        return report


# Global instance
disagreement_detector = None

def get_disagreement_detector() -> DisagreementDetector:
    """Lazy-load Disagreement Detector"""
    global disagreement_detector
    if disagreement_detector is None:
        disagreement_detector = DisagreementDetector()
    return disagreement_detector
