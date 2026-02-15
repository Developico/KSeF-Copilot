'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import Markdown from 'react-markdown'
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
      fetch('/changelog.md')
        .then(response => response.text())
        .then(text => {
          setChangelog(text)
          setLoading(false)
        })
        .catch(error => {
          console.error('Failed to load changelog:', error)
          setChangelog('# Error\n\nFailed to load changelog. Please try again later.')
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
                    Developico KSeF v0.1.0
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
                  <p className="text-gray-600 dark:text-gray-400">Ładowanie...</p>
                </div>
              ) : (
                <div className="p-6 prose prose-sm dark:prose-invert max-w-none">
                  <Markdown
                    components={{
                      h1: ({ children }) => <h1 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">{children}</h1>,
                      h2: ({ children }) => <h2 className="text-xl font-semibold mt-6 mb-3 text-gray-800 dark:text-gray-100 border-b pb-2">{children}</h2>,
                      h3: ({ children }) => <h3 className="text-lg font-medium mt-4 mb-2 text-gray-800 dark:text-gray-200">{children}</h3>,
                      ul: ({ children }) => <ul className="list-disc pl-5 space-y-1 mb-4">{children}</ul>,
                      ol: ({ children }) => <ol className="list-decimal pl-5 space-y-1 mb-4">{children}</ol>,
                      li: ({ children }) => <li className="text-gray-700 dark:text-gray-300">{children}</li>,
                      p: ({ children }) => <p className="mb-3 text-gray-700 dark:text-gray-300">{children}</p>,
                      code: ({ children }) => <code className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-sm font-mono text-primary">{children}</code>,
                      pre: ({ children }) => <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg overflow-x-auto mb-4">{children}</pre>,
                      a: ({ href, children }) => <a href={href} className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">{children}</a>,
                      strong: ({ children }) => <strong className="font-semibold text-gray-900 dark:text-white">{children}</strong>,
                      blockquote: ({ children }) => <blockquote className="border-l-4 border-primary pl-4 italic text-gray-600 dark:text-gray-400 my-4">{children}</blockquote>,
                    }}
                  >
                    {changelog}
                  </Markdown>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
