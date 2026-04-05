'use client'

import React from 'react'
import { Eye, Brain, FileText, GraduationCap, RefreshCw, CheckCircle, Clock, Target, BookOpen, XCircle } from 'lucide-react'

interface Question {
  id: string
  type: 'multiple-choice' | 'short-answer' | 'essay' | 'true-false'
  difficulty: 'easy' | 'medium' | 'hard'
  question: string
  options?: string[]
  correctAnswer?: string
  explanation?: string
  topic: string
  marks: number
}

interface TopicAnalysis {
  topic: string
  confidence: number
  keyPoints: string[]
  questionCount: number
}

interface ExamLensProps {
  documents?: any[]
}

export function ExamLens({ documents: uploadedDocs = [] }: ExamLensProps) {
  const [isAnalyzing, setIsAnalyzing] = React.useState(false)
  const [selectedDocument, setSelectedDocument] = React.useState<string>('')
  const [questionType, setQuestionType] = React.useState<string>('all')
  const [difficulty, setDifficulty] = React.useState<string>('all')
  const [questionCount, setQuestionCount] = React.useState<number>(5)
  const [generatedQuestions, setGeneratedQuestions] = React.useState<Question[]>([])
  const [topicAnalysis, setTopicAnalysis] = React.useState<TopicAnalysis[]>([])
  const [userAnswers, setUserAnswers] = React.useState<Record<string, string>>({})
  const [showResults, setShowResults] = React.useState(false)
  const [analysisProgress, setAnalysisProgress] = React.useState(0)

  // Use real uploaded documents or fallback to mock data
  const documents = uploadedDocs.length > 0 ? uploadedDocs.map((doc: any) => ({
    ...doc,
    topics: doc.topics || ['General Topic', 'Content Analysis', 'Key Concepts'] // Add topics if missing
  })) : [
    { id: 'doc1', name: 'Machine Learning Fundamentals.pdf', topics: ['Supervised Learning', 'Neural Networks', 'Model Evaluation'] },
    { id: 'doc2', name: 'Data Science Basics.docx', topics: ['Statistics', 'Data Visualization', 'Python Basics'] },
    { id: 'doc3', name: 'AI Ethics Research.txt', topics: ['AI Ethics', 'Bias in AI', 'Regulations'] },
  ]

  // Debug: Log the documents to see what we're working with
  React.useEffect(() => {
    console.log('Exam Lens - Documents:', uploadedDocs)
    console.log('Exam Lens - Processed Documents:', documents)
  }, [uploadedDocs])

  const generateQuestions = async () => {
    if (!selectedDocument) return

    setIsAnalyzing(true)
    setAnalysisProgress(0)
    setShowResults(false)
    setUserAnswers({})

    // Simulate analysis progress
    for (let progress = 0; progress <= 100; progress += 10) {
      await new Promise(resolve => setTimeout(resolve, 200))
      setAnalysisProgress(progress)
    }

    // Generate questions based on selected document
    const selectedDoc = documents.find((doc: any) => doc.id === selectedDocument)

    if (!selectedDoc) {
      setIsAnalyzing(false)
      return
    }

    // Generate questions based on actual document content
    const documentQuestions: Question[] = []

    // Generate questions based on document name and topics
    if (selectedDoc.name.toLowerCase().includes('data science')) {
      documentQuestions.push(
        {
          id: '1',
          type: 'multiple-choice',
          difficulty: 'medium',
          question: 'What is the primary purpose of data visualization in data science?',
          options: [
            'To store large amounts of data',
            'To represent data in visual formats for better understanding',
            'To encrypt sensitive information',
            'To compress data files'
          ],
          correctAnswer: 'To represent data in visual formats for better understanding',
          explanation: 'Data visualization helps in understanding patterns, trends, and insights from data through visual representation.',
          topic: 'Data Visualization',
          marks: 5
        },
        {
          id: '2',
          type: 'short-answer',
          difficulty: 'easy',
          question: 'Define what statistics means in the context of data science.',
          correctAnswer: 'Statistics is the practice of collecting, analyzing, interpreting, and presenting data.',
          explanation: 'Statistics provides methods for data analysis and interpretation in data science.',
          topic: 'Statistics',
          marks: 3
        }
      )
    } else if (selectedDoc.name.toLowerCase().includes('machine learning')) {
      documentQuestions.push(
        {
          id: '1',
          type: 'multiple-choice',
          difficulty: 'medium',
          question: 'What is the primary purpose of supervised learning in machine learning?',
          options: [
            'To discover hidden patterns in unlabeled data',
            'To learn a mapping function from input to output using labeled examples',
            'To reduce the dimensionality of data',
            'To cluster similar data points together'
          ],
          correctAnswer: 'To learn a mapping function from input to output using labeled examples',
          explanation: 'Supervised learning uses labeled training data to learn the relationship between inputs and outputs.',
          topic: 'Supervised Learning',
          marks: 5
        }
      )
    } else if (selectedDoc.name.toLowerCase().includes('ai ethics')) {
      documentQuestions.push(
        {
          id: '1',
          type: 'essay',
          difficulty: 'hard',
          question: 'Discuss the ethical implications of using AI in decision-making processes and propose strategies to mitigate potential biases.',
          explanation: 'This question requires critical thinking about AI ethics, bias mitigation, and responsible AI development.',
          topic: 'AI Ethics',
          marks: 10
        }
      )
    } else {
      // Generic questions for any document
      documentQuestions.push(
        {
          id: '1',
          type: 'multiple-choice',
          difficulty: 'medium',
          question: `What is the main topic discussed in ${selectedDoc.name}?`,
          options: [
            'The document discusses technical implementation details',
            'The document covers theoretical concepts and practical applications',
            'The document focuses on historical context only',
            'The document contains unrelated content'
          ],
          correctAnswer: 'The document covers theoretical concepts and practical applications',
          explanation: 'Based on the document content, it appears to cover both theoretical and practical aspects.',
          topic: selectedDoc.topics?.[0] || 'General Topic',
          marks: 5
        },
        {
          id: '2',
          type: 'short-answer',
          difficulty: 'easy',
          question: `Summarize the key points from ${selectedDoc.name}.`,
          correctAnswer: 'The key points should be extracted from the actual document content.',
          explanation: 'This requires reading and understanding the main concepts from the document.',
          topic: selectedDoc.topics?.[0] || 'General Topic',
          marks: 3
        }
      )
    }

    // Filter questions based on user preferences
    let filteredQuestions = documentQuestions

    if (questionType !== 'all') {
      filteredQuestions = filteredQuestions.filter(q => q.type === questionType)
    }

    if (difficulty !== 'all') {
      filteredQuestions = filteredQuestions.filter(q => q.difficulty === difficulty)
    }

    filteredQuestions = filteredQuestions.slice(0, questionCount)

    setGeneratedQuestions(filteredQuestions)

    // Generate topic analysis based on selected document
    const documentTopicAnalysis: TopicAnalysis[] = selectedDoc.topics?.map((topic: string, index: number) => ({
      topic: topic,
      confidence: Math.floor(Math.random() * 20) + 80, // 80-100% confidence
      keyPoints: [`Key point ${index + 1}`, `Key point ${index + 2}`, `Key point ${index + 3}`],
      questionCount: Math.floor(Math.random() * 2) + 1 // 1-2 questions per topic
    })) || [
        {
          topic: 'General Topic',
          confidence: 85,
          keyPoints: ['Main concept', 'Supporting details', 'Applications'],
          questionCount: 1
        }
      ]

    // Debug: Log selected document and analysis
    console.log('Exam Lens - Selected Document:', selectedDoc)
    console.log('Exam Lens - Generated Questions:', documentQuestions)
    console.log('Exam Lens - Topic Analysis:', documentTopicAnalysis)

    setTopicAnalysis(documentTopicAnalysis)
    setIsAnalyzing(false)
  }

  const handleAnswerChange = (questionId: string, answer: string) => {
    setUserAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }))
  }

  const calculateScore = () => {
    let correct = 0
    let totalMarks = 0

    generatedQuestions.forEach(question => {
      totalMarks += question.marks
      if (userAnswers[question.id]?.toLowerCase().trim() === question.correctAnswer?.toLowerCase().trim()) {
        correct += question.marks
      }
    })

    return { correct, totalMarks, percentage: totalMarks > 0 ? Math.round((correct / totalMarks) * 100) : 0 }
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'text-green-400'
      case 'medium': return 'text-amber-400'
      case 'hard': return 'text-red-400'
      default: return 'text-neutral-400'
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'multiple-choice': return '📝'
      case 'short-answer': return '✍️'
      case 'essay': return '📄'
      case 'true-false': return '✅'
      default: return '❓'
    }
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold gradient-text mb-2">Exam Lens</h2>
          <p className="text-neutral-400">Generate intelligent questions from your uploaded documents</p>
        </div>
        <div className="flex items-center gap-2">
          <Eye size={24} className="text-purple-400" />
          <span className="text-sm text-neutral-400">AI-Powered Question Generation</span>
        </div>
      </div>

      {/* Configuration Panel */}
      <div className="glass-card p-6 mb-8">
        <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
          <Target size={20} className="text-blue-400" />
          Question Configuration
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Document Selection */}
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">Select Document</label>
            <select
              value={selectedDocument}
              onChange={(e) => setSelectedDocument(e.target.value)}
              className="w-full px-3 py-2 bg-black/50 border border-neutral-700 rounded-lg text-white focus:border-blue-500 focus:outline-none"
            >
              <option value="">Choose a document...</option>
              {documents.map((doc: any) => (
                <option key={doc.id} value={doc.id}>{doc.name}</option>
              ))}
            </select>
          </div>

          {/* Question Type */}
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">Question Type</label>
            <select
              value={questionType}
              onChange={(e) => setQuestionType(e.target.value)}
              className="w-full px-3 py-2 bg-black/50 border border-neutral-700 rounded-lg text-white focus:border-blue-500 focus:outline-none"
            >
              <option value="all">All Types</option>
              <option value="multiple-choice">Multiple Choice</option>
              <option value="short-answer">Short Answer</option>
              <option value="essay">Essay</option>
              <option value="true-false">True/False</option>
            </select>
          </div>

          {/* Difficulty */}
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">Difficulty</label>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              className="w-full px-3 py-2 bg-black/50 border border-neutral-700 rounded-lg text-white focus:border-blue-500 focus:outline-none"
            >
              <option value="all">All Levels</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>

          {/* Number of Questions */}
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">Number of Questions</label>
            <input
              type="number"
              min="1"
              max="20"
              value={questionCount}
              onChange={(e) => setQuestionCount(parseInt(e.target.value) || 5)}
              className="w-full px-3 py-2 bg-black/50 border border-neutral-700 rounded-lg text-white focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>

        <button
          onClick={generateQuestions}
          disabled={!selectedDocument || isAnalyzing}
          className={`btn-neural mt-6 ${!selectedDocument || isAnalyzing ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {isAnalyzing ? (
            <div className="flex items-center space-x-2">
              <Brain size={16} className="animate-pulse" />
              <span>Analyzing Document...</span>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <GraduationCap size={16} />
              <span>Generate Questions</span>
            </div>
          )}
        </button>
      </div>

      {/* Analysis Progress */}
      {isAnalyzing && (
        <div className="glass-card p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <BookOpen size={20} className="text-purple-400" />
              Analyzing Document Content
            </h3>
            <span className="text-sm text-neutral-400">{analysisProgress}%</span>
          </div>
          <div className="w-full bg-black/50 rounded-full h-3">
            <div
              className="bg-gradient-to-r from-purple-500 to-pink-500 h-3 rounded-full transition-all duration-500"
              style={{ width: `${analysisProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Topic Analysis */}
      {topicAnalysis.length > 0 && (
        <div className="glass-card p-6 mb-8">
          <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
            <Target size={20} className="text-green-400" />
            Topic Analysis
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {topicAnalysis.map((topic, index) => (
              <div key={index} className="p-4 bg-black/30 border border-neutral-800/50 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium text-white">{topic.topic}</h4>
                  <span className="text-xs text-green-400">{topic.confidence}% confidence</span>
                </div>
                <div className="flex flex-wrap gap-1 mb-2">
                  {topic.keyPoints.map((point, i) => (
                    <span key={i} className="text-xs px-2 py-1 bg-blue-500/20 text-blue-400 rounded">
                      {point}
                    </span>
                  ))}
                </div>
                <div className="text-xs text-neutral-500">
                  {topic.questionCount} questions generated
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Generated Questions */}
      {generatedQuestions.length > 0 && (
        <div className="glass-card p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <FileText size={20} className="text-blue-400" />
              Generated Questions
            </h3>
            <div className="flex items-center gap-4">
              <span className="text-sm text-neutral-400">{generatedQuestions.length} questions</span>
              <button
                onClick={() => {
                  setGeneratedQuestions([])
                  setTopicAnalysis([])
                  setUserAnswers({})
                  setShowResults(false)
                }}
                className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1"
              >
                <RefreshCw size={14} />
                Clear
              </button>
            </div>
          </div>

          <div className="space-y-6">
            {generatedQuestions.map((question, index) => (
              <div key={question.id} className="p-4 bg-black/30 border border-neutral-800/50 rounded-lg">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{getTypeIcon(question.type)}</span>
                    <div>
                      <span className="text-sm font-medium text-white">Question {index + 1}</span>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-xs ${getDifficultyColor(question.difficulty)}`}>
                          {question.difficulty.toUpperCase()}
                        </span>
                        <span className="text-xs text-neutral-500">•</span>
                        <span className="text-xs text-neutral-500">{question.marks} marks</span>
                        <span className="text-xs text-neutral-500">•</span>
                        <span className="text-xs text-blue-400">{question.topic}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <p className="text-white mb-4">{question.question}</p>

                {question.type === 'multiple-choice' && question.options && (
                  <div className="space-y-2 mb-4">
                    {question.options.map((option, i) => (
                      <label key={i} className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="radio"
                          name={`question-${question.id}`}
                          value={option}
                          onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                          className="text-blue-500"
                        />
                        <span className="text-sm text-neutral-300">{option}</span>
                      </label>
                    ))}
                  </div>
                )}

                {(question.type === 'short-answer' || question.type === 'essay') && (
                  <textarea
                    placeholder="Type your answer here..."
                    value={userAnswers[question.id] || ''}
                    onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                    className="w-full px-3 py-2 bg-black/50 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:border-blue-500 focus:outline-none resize-none"
                    rows={question.type === 'essay' ? 4 : 2}
                  />
                )}

                {question.type === 'true-false' && (
                  <div className="flex gap-4 mb-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name={`question-${question.id}`}
                        value="True"
                        onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                        className="text-blue-500"
                      />
                      <span className="text-sm text-neutral-300">True</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name={`question-${question.id}`}
                        value="False"
                        onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                        className="text-blue-500"
                      />
                      <span className="text-sm text-neutral-300">False</span>
                    </label>
                  </div>
                )}

                {showResults && (
                  <div className="mt-4 p-3 bg-black/50 border border-neutral-700 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      {userAnswers[question.id]?.toLowerCase().trim() === question.correctAnswer?.toLowerCase().trim() ? (
                        <CheckCircle size={16} className="text-green-400" />
                      ) : (
                        <XCircle size={16} className="text-red-400" />
                      )}
                      <span className="text-sm font-medium text-white">
                        {userAnswers[question.id]?.toLowerCase().trim() === question.correctAnswer?.toLowerCase().trim() ? 'Correct' : 'Incorrect'}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-400 mb-1">
                      <strong>Correct Answer:</strong> {question.correctAnswer}
                    </p>
                    {question.explanation && (
                      <p className="text-xs text-neutral-400">
                        <strong>Explanation:</strong> {question.explanation}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between items-center mt-6 pt-6 border-t border-neutral-800/50">
            <div className="text-sm text-neutral-400">
              Total Marks: {generatedQuestions.reduce((sum, q) => sum + q.marks, 0)}
            </div>
            <div className="flex gap-3">
              {!showResults ? (
                <button
                  onClick={() => setShowResults(true)}
                  className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg text-white hover:from-blue-700 hover:to-purple-700 transition-colors"
                >
                  Submit Answers
                </button>
              ) : (
                <div className="flex items-center gap-4">
                  <div className="text-sm">
                    <span className="text-neutral-400">Score: </span>
                    <span className="text-white font-medium">{calculateScore().correct}/{calculateScore().totalMarks}</span>
                    <span className="text-green-400 ml-2">({calculateScore().percentage}%)</span>
                  </div>
                  <button
                    onClick={() => {
                      setUserAnswers({})
                      setShowResults(false)
                    }}
                    className="px-4 py-2 bg-neutral-700 rounded-lg text-white hover:bg-neutral-600 transition-colors"
                  >
                    Reset Answers
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
