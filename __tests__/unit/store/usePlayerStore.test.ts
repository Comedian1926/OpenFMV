import { describe, it, expect, beforeEach } from 'vitest'
import { usePlayerStore } from '@/app/_store/usePlayerStore'

describe('group', () => {
  beforeEach(() => {
    usePlayerStore.getState().reset()
  })

  describe('group', () => {
    it('works', () => {
      expect(usePlayerStore.getState().isPlaying).toBe(false)
      
      usePlayerStore.getState().setIsPlaying(true)
      expect(usePlayerStore.getState().isPlaying).toBe(true)
      
      usePlayerStore.getState().setIsPlaying(false)
      expect(usePlayerStore.getState().isPlaying).toBe(false)
    })

    it('works', () => {
      expect(usePlayerStore.getState().currentNodeId).toBeNull()
      
      usePlayerStore.getState().setCurrentNode('node-1')
      expect(usePlayerStore.getState().currentNodeId).toBe('node-1')
      
      usePlayerStore.getState().setCurrentNode('node-2')
      expect(usePlayerStore.getState().currentNodeId).toBe('node-2')
    })
  })

  describe('group', () => {
    it('works', () => {
      usePlayerStore.getState().addToHistory('node-1')
      expect(usePlayerStore.getState().history).toEqual(['node-1'])
      
      usePlayerStore.getState().addToHistory('node-2')
      expect(usePlayerStore.getState().history).toEqual(['node-1', 'node-2'])
      
      usePlayerStore.getState().addToHistory('node-3')
      expect(usePlayerStore.getState().history).toEqual(['node-1', 'node-2', 'node-3'])
    })

    it('works', () => {
      usePlayerStore.getState().addToHistory('node-1')
      usePlayerStore.getState().addToHistory('node-2')
      usePlayerStore.getState().addToHistory('node-1')
      
      expect(usePlayerStore.getState().history).toEqual(['node-1', 'node-2', 'node-1'])
    })
  })

  describe('group', () => {
    it('works', () => {
      usePlayerStore.getState().setVariable('score', 100)
      expect(usePlayerStore.getState().variables).toEqual({ score: 100 })
      
      usePlayerStore.getState().setVariable('name', 'Hero')
      expect(usePlayerStore.getState().variables).toEqual({ score: 100, name: 'Hero' })
    })

    it('works', () => {
      usePlayerStore.getState().setVariable('health', 100)
      expect(usePlayerStore.getState().variables.health).toBe(100)
      
      usePlayerStore.getState().setVariable('health', 80)
      expect(usePlayerStore.getState().variables.health).toBe(80)
    })

    it('works', () => {
      usePlayerStore.getState().setVariable('string', 'text')
      usePlayerStore.getState().setVariable('number', 42)
      usePlayerStore.getState().setVariable('boolean', true)
      usePlayerStore.getState().setVariable('object', { key: 'value' })
      usePlayerStore.getState().setVariable('array', [1, 2, 3])
      
      expect(usePlayerStore.getState().variables).toEqual({
        string: 'text',
        number: 42,
        boolean: true,
        object: { key: 'value' },
        array: [1, 2, 3],
      })
    })
  })

  describe('group', () => {
    it('works', () => {
      usePlayerStore.getState().setIsPlaying(true)
      usePlayerStore.getState().setCurrentNode('node-1')
      usePlayerStore.getState().addToHistory('node-1')
      usePlayerStore.getState().addToHistory('node-2')
      usePlayerStore.getState().setVariable('score', 100)
      
      usePlayerStore.getState().reset()
      
      const state = usePlayerStore.getState()
      expect(state.isPlaying).toBe(false)
      expect(state.currentNodeId).toBeNull()
      expect(state.history).toEqual([])
      expect(state.variables).toEqual({})
    })
  })

  describe('group', () => {
    it('works', () => {
      usePlayerStore.getState().setIsPlaying(true)
      usePlayerStore.getState().setCurrentNode('start-node')
      usePlayerStore.getState().addToHistory('start-node')
      
      expect(usePlayerStore.getState().isPlaying).toBe(true)
      expect(usePlayerStore.getState().currentNodeId).toBe('start-node')
      expect(usePlayerStore.getState().history).toEqual(['start-node'])
      
      usePlayerStore.getState().setVariable('playerName', 'Alice')
      usePlayerStore.getState().setCurrentNode('story-node-1')
      usePlayerStore.getState().addToHistory('story-node-1')
      
      expect(usePlayerStore.getState().currentNodeId).toBe('story-node-1')
      expect(usePlayerStore.getState().history).toEqual(['start-node', 'story-node-1'])
      expect(usePlayerStore.getState().variables.playerName).toBe('Alice')
      
      usePlayerStore.getState().setIsPlaying(false)
      
      expect(usePlayerStore.getState().isPlaying).toBe(false)
      expect(usePlayerStore.getState().history).toHaveLength(2)
    })
  })
})
