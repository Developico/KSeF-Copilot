'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ChangelogModalProps {
  isOpen: boolean
  onClose: () => void
}

export function ChangelogModal({ isOpen, onClose }: ChangelogModalProps) {
  const [changelog, setChangelog] = useState<string>('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isOpen) {
      fetch('/changelog.txt')
        .then(response => response.text())
        .then(text => {
          setChangelog(text)
          setLoading(false)
        })
        .catch(error => {
          console.error('Failed to load changelog:', error)
          setChangelog('Failed to load changelog. Please try again later.')
          setLoading(false)
        })
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 transition-opacity duration-300"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className={`
        fixed top-0 left-0 right-0 z-50 
        transform transition-transform duration-500 ease-out
        ${isOpen ? 'translate-y-0' : '-translate-y-full'}
      `}>
        <div className="max-w-4xl mx-auto mt-4 mb-8 px-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="text-2xl">📋</div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    Changelog
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    dvlp-ksef v0.1.0
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-8 w-8 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Content */}
            <div className="max-h-[70vh] overflow-y-auto">
              {loading ? (
                <div className="p-8 text-center">
                  <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">Loading changelog...</p>
                </div>
              ) : (
                <div className="p-6">
                  <pre className="whitespace-pre-wrap text-sm font-mono bg-gray-50 dark:bg-gray-800 p-4 rounded-lg overflow-x-auto text-gray-800 dark:text-gray-200">
                    {changelog}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
