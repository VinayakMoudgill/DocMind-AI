'use client'

import React from 'react'
import { Activity, TrendingUp, AlertTriangle, Brain, Zap, Wifi, Database, Shield } from 'lucide-react'

interface SignalMetrics {
  name: string
  value: string
  status: 'optimal' | 'warning' | 'critical'
  trend: 'up' | 'down' | 'stable'
}

interface NeuralSignal {
  id: string
  name: string
  frequency: string
  amplitude: string
  status: 'active' | 'inactive' | 'processing'
}

export function SignalAnalysis() {
  const [isAnalyzing, setIsAnalyzing] = React.useState(false)
  const [analysisProgress, setAnalysisProgress] = React.useState(0)
  
  const signalMetrics: SignalMetrics[] = [
    { name: 'Neural Network Health', value: '98.2%', status: 'optimal', trend: 'up' },
    { name: 'Document Processing Rate', value: '1,247 docs/hr', status: 'optimal', trend: 'up' },
    { name: 'Query Response Time', value: '142ms', status: 'optimal', trend: 'stable' },
    { name: 'Memory Utilization', value: '67.3%', status: 'warning', trend: 'up' },
    { name: 'API Error Rate', value: '0.12%', status: 'optimal', trend: 'down' },
    { name: 'Vector Index Size', value: '2.4GB', status: 'optimal', trend: 'up' },
  ]

  const neuralSignals: NeuralSignal[] = [
    { id: 'alpha', name: 'Alpha Wave Processor', frequency: '8-12 Hz', amplitude: 'High', status: 'active' },
    { id: 'beta', name: 'Beta Wave Analyzer', frequency: '13-30 Hz', amplitude: 'Medium', status: 'active' },
    { id: 'gamma', name: 'Gamma Wave Indexer', frequency: '30-100 Hz', amplitude: 'High', status: 'processing' },
    { id: 'delta', name: 'Delta Wave Storage', frequency: '0.5-4 Hz', amplitude: 'Low', status: 'inactive' },
  ]

  const handleStartAnalysis = () => {
    setIsAnalyzing(true)
    setAnalysisProgress(0)
    
    // Simulate analysis progress
    const interval = setInterval(() => {
      setAnalysisProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval)
          setIsAnalyzing(false)
          return 100
        }
        return prev + 10
      })
    }, 500)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'optimal':
      case 'active':
        return 'text-green-400'
      case 'warning':
      case 'processing':
        return 'text-amber-400'
      case 'critical':
      case 'inactive':
        return 'text-red-400'
      default:
        return 'text-neutral-400'
    }
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp size={16} className="text-green-400" />
      case 'down':
        return <TrendingUp size={16} className="text-red-400 rotate-180" />
      default:
        return <div className="w-4 h-4 rounded-full bg-neutral-600" />
    }
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold gradient-text mb-2">Signal Analysis</h2>
          <p className="text-neutral-400">Real-time monitoring of neural network signals and system performance</p>
        </div>
        <button
          onClick={handleStartAnalysis}
          disabled={isAnalyzing}
          className={`btn-neural ${isAnalyzing ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {isAnalyzing ? (
            <div className="flex items-center space-x-2">
              <Activity size={16} className="animate-pulse" />
              <span>Analyzing...</span>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <Zap size={16} />
              <span>Start Analysis</span>
            </div>
          )}
        </button>
      </div>

      {/* Analysis Progress */}
      {isAnalyzing && (
        <div className="glass-card p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Brain size={20} className="text-blue-400" />
              Neural Signal Analysis in Progress
            </h3>
            <span className="text-sm text-neutral-400">{analysisProgress}%</span>
          </div>
          <div className="w-full bg-black/50 rounded-full h-3">
            <div 
              className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full transition-all duration-500"
              style={{ width: `${analysisProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Signal Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {signalMetrics.map((metric, index) => (
          <div key={index} className="glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-medium text-neutral-300">{metric.name}</h4>
              {getTrendIcon(metric.trend)}
            </div>
            <div className="flex items-end justify-between">
              <span className="text-2xl font-bold text-white">{metric.value}</span>
              <span className={`text-xs font-medium ${getStatusColor(metric.status)}`}>
                {metric.status.toUpperCase()}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Neural Signals */}
      <div className="glass-card p-6 mb-8">
        <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
          <Wifi size={20} className="text-purple-400" />
          Neural Signal Processors
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {neuralSignals.map((signal) => (
            <div key={signal.id} className="p-4 bg-black/30 border border-neutral-800/50 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-white">{signal.name}</h4>
                <div className={`w-2 h-2 rounded-full ${
                  signal.status === 'active' ? 'bg-green-400' :
                  signal.status === 'processing' ? 'bg-amber-400 animate-pulse' :
                  'bg-red-400'
                }`} />
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-neutral-400">Frequency:</span>
                  <span className="text-neutral-300">{signal.frequency}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-neutral-400">Amplitude:</span>
                  <span className="text-neutral-300">{signal.amplitude}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-neutral-400">Status:</span>
                  <span className={getStatusColor(signal.status)}>{signal.status.toUpperCase()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* System Health Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <Database size={20} className="text-blue-400" />
            <h3 className="text-lg font-semibold text-white">Database Status</h3>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-neutral-400">Documents:</span>
              <span className="text-white">12,847</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-neutral-400">Vectors:</span>
              <span className="text-white">1.2M</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-neutral-400">Storage:</span>
              <span className="text-white">8.4GB</span>
            </div>
          </div>
        </div>

        <div className="glass-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <Shield size={20} className="text-green-400" />
            <h3 className="text-lg font-semibold text-white">Security Status</h3>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-neutral-400">Firewall:</span>
              <span className="text-green-400">Active</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-neutral-400">Encryption:</span>
              <span className="text-green-400">AES-256</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-neutral-400">Threats:</span>
              <span className="text-green-400">None</span>
            </div>
          </div>
        </div>

        <div className="glass-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <Activity size={20} className="text-purple-400" />
            <h3 className="text-lg font-semibold text-white">Performance</h3>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-neutral-400">CPU Usage:</span>
              <span className="text-amber-400">42%</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-neutral-400">Memory:</span>
              <span className="text-amber-400">67%</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-neutral-400">Network:</span>
              <span className="text-green-400">Optimal</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
