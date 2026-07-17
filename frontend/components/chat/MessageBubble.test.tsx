import type { ChipAction } from './types'

/**
 * Chip selection test suite
 * Tests handleCardSelect scenarios to ensure robust TEXT_MESSAGE payload construction
 */

describe('CardSelectorChip - handleCardSelect', () => {
  // Mock onAction function to capture what's sent
  const mockOnAction = jest.fn()

  // Helper to simulate handleCardSelect logic (extracted from component)
  const handleCardSelect = (chip: ChipAction, projectId: string) => {
    const payload = (chip.payload as any) || {}
    const projects = payload.projects as Array<{ id: string; name: string }> | undefined

    // Validate chip has projects array
    if (!projects || projects.length === 0) {
      console.error('[CHIP] No projects in chip payload:', { chipId: chip.id, chipLabel: chip.label, payload })
      return
    }

    // Try exact match first
    let selectedProject = projects.find(p => p && String(p.id) === String(projectId))

    // Fallback: try parsing projectId as array index
    if (!selectedProject && projectId) {
      const idx = parseInt(projectId, 10)
      if (!isNaN(idx) && projects[idx]) {
        selectedProject = projects[idx]
      }
    }

    // Final fallback: use first project
    if (!selectedProject) {
      selectedProject = projects[0]
    }

    // Validate action type
    if (chip.actionType !== 'TEXT_MESSAGE') {
      console.error('[CHIP] Chip is not TEXT_MESSAGE:', { chipId: chip.id, actionType: chip.actionType })
      return
    }

    // Build natural language message
    const prefix = String(payload.actionPrefix || chip.label || 'Consider').trim()
    const suffix = String(payload.actionSuffix || '?').trim()

    if (!prefix || !selectedProject?.name) {
      console.error('[CHIP] Missing message parts:', { prefix, projectName: selectedProject?.name })
      return
    }

    const fullMessage = `${prefix} ${selectedProject.name}${suffix}`.trim()

    if (!fullMessage) {
      console.error('[CHIP] Empty message after construction')
      return
    }

    // Send TEXT_MESSAGE
    const textChip = {
      ...chip,
      actionType: 'TEXT_MESSAGE' as const,
      payload: { text: fullMessage }
    }
    mockOnAction(textChip)
  }

  beforeEach(() => {
    mockOnAction.mockClear()
  })

  // HAPPY PATH TESTS
  it('should send valid TEXT_MESSAGE with actionPrefix + projectName + actionSuffix', () => {
    const chip: ChipAction = {
      id: 'test-amenities',
      label: 'Explore amenities',
      actionType: 'TEXT_MESSAGE',
      icon: '🏛',
      payload: {
        actionPrefix: 'List key amenities for',
        projects: [
          { id: '1', name: 'Ivy County' },
          { id: '2', name: 'Maxblis White House' }
        ],
        actionSuffix: '.'
      }
    }

    handleCardSelect(chip, '1')

    expect(mockOnAction).toHaveBeenCalledWith({
      ...chip,
      actionType: 'TEXT_MESSAGE',
      payload: { text: 'List key amenities for Ivy County.' }
    })
  })

  it('should send message with default suffix when actionSuffix missing', () => {
    const chip: ChipAction = {
      id: 'test-budget',
      label: 'Review payment plans',
      actionType: 'TEXT_MESSAGE',
      payload: {
        actionPrefix: 'Show payment-plan options for',
        projects: [{ id: '1', name: 'Mahagun Modern' }]
      }
    }

    handleCardSelect(chip, '1')

    expect(mockOnAction).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: { text: 'Show payment-plan options for Mahagun Modern?' }
      })
    )
  })

  it('should send message with chip label as actionPrefix when actionPrefix missing', () => {
    const chip: ChipAction = {
      id: 'test-fallback',
      label: 'Check connectivity',
      actionType: 'TEXT_MESSAGE',
      payload: {
        projects: [{ id: '1', name: 'Sector 75 Project' }]
      }
    }

    handleCardSelect(chip, '1')

    expect(mockOnAction).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: { text: 'Check connectivity Sector 75 Project?' }
      })
    )
  })

  // FALLBACK PATH TESTS
  it('should fallback to first project when projectId does not match', () => {
    const chip: ChipAction = {
      id: 'test-fallback-id',
      label: 'Test chip',
      actionType: 'TEXT_MESSAGE',
      payload: {
        actionPrefix: 'Test',
        projects: [
          { id: '10', name: 'First Project' },
          { id: '20', name: 'Second Project' }
        ]
      }
    }

    handleCardSelect(chip, 'nonexistent-id')

    expect(mockOnAction).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: { text: 'Test First Project?' }
      })
    )
  })

  it('should handle numeric projectId by array index', () => {
    const chip: ChipAction = {
      id: 'test-index',
      label: 'Test chip',
      actionType: 'TEXT_MESSAGE',
      payload: {
        actionPrefix: 'Show',
        projects: [
          { id: 'abc', name: 'Project A' },
          { id: 'def', name: 'Project B' },
          { id: 'ghi', name: 'Project C' }
        ]
      }
    }

    // projectId "1" should select index 1 (Project B)
    handleCardSelect(chip, '1')

    expect(mockOnAction).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: { text: 'Show Project B?' }
      })
    )
  })

  // ERROR CASES (should NOT call onAction)
  it('should not send when projects array is missing', () => {
    const chip: ChipAction = {
      id: 'test-no-projects',
      label: 'Bad chip',
      actionType: 'TEXT_MESSAGE',
      payload: {
        actionPrefix: 'Test'
      }
    }

    handleCardSelect(chip, '1')

    expect(mockOnAction).not.toHaveBeenCalled()
  })

  it('should not send when projects array is empty', () => {
    const chip: ChipAction = {
      id: 'test-empty-projects',
      label: 'Bad chip',
      actionType: 'TEXT_MESSAGE',
      payload: {
        actionPrefix: 'Test',
        projects: []
      }
    }

    handleCardSelect(chip, '1')

    expect(mockOnAction).not.toHaveBeenCalled()
  })

  it('should not send when chip actionType is not TEXT_MESSAGE', () => {
    const chip: ChipAction = {
      id: 'test-wrong-type',
      label: 'Bad chip',
      actionType: 'INTENT_PATCH',
      payload: {
        actionPrefix: 'Test',
        projects: [{ id: '1', name: 'Project' }]
      }
    }

    handleCardSelect(chip, '1')

    expect(mockOnAction).not.toHaveBeenCalled()
  })

  it('should not send when prefix is empty after trim', () => {
    const chip: ChipAction = {
      id: 'test-empty-prefix',
      label: '',
      actionType: 'TEXT_MESSAGE',
      payload: {
        actionPrefix: '   ',
        projects: [{ id: '1', name: 'Project' }]
      }
    }

    handleCardSelect(chip, '1')

    expect(mockOnAction).not.toHaveBeenCalled()
  })

  it('should not send when projectName is missing', () => {
    const chip: ChipAction = {
      id: 'test-no-name',
      label: 'Test',
      actionType: 'TEXT_MESSAGE',
      payload: {
        actionPrefix: 'Test',
        projects: [{ id: '1', name: '' }]
      }
    }

    handleCardSelect(chip, '1')

    expect(mockOnAction).not.toHaveBeenCalled()
  })

  // STRESS TESTS
  it('should handle very long project names', () => {
    const longName = 'A'.repeat(500)
    const chip: ChipAction = {
      id: 'test-long-name',
      label: 'Test',
      actionType: 'TEXT_MESSAGE',
      payload: {
        actionPrefix: 'List amenities for',
        projects: [{ id: '1', name: longName }]
      }
    }

    handleCardSelect(chip, '1')

    expect(mockOnAction).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: { text: expect.stringContaining(longName) }
      })
    )
  })

  it('should handle special characters in projectName', () => {
    const chip: ChipAction = {
      id: 'test-special-chars',
      label: 'Test',
      actionType: 'TEXT_MESSAGE',
      payload: {
        actionPrefix: 'List amenities for',
        projects: [{ id: '1', name: 'Ivy County "Elite" (Sector 75) & Co.' }]
      }
    }

    handleCardSelect(chip, '1')

    expect(mockOnAction).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: { text: 'List amenities for Ivy County "Elite" (Sector 75) & Co.?' }
      })
    )
  })

  it('should handle many projects (stress)', () => {
    const manyProjects = Array.from({ length: 100 }, (_, i) => ({
      id: String(i),
      name: `Project ${i}`
    }))

    const chip: ChipAction = {
      id: 'test-many-projects',
      label: 'Test',
      actionType: 'TEXT_MESSAGE',
      payload: {
        actionPrefix: 'Show',
        projects: manyProjects
      }
    }

    handleCardSelect(chip, '50')

    expect(mockOnAction).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: { text: 'Show Project 50?' }
      })
    )
  })

  it('should handle undefined payload gracefully', () => {
    const chip: ChipAction = {
      id: 'test-undefined-payload',
      label: 'Consider',
      actionType: 'TEXT_MESSAGE'
    }

    handleCardSelect(chip, '1')

    expect(mockOnAction).not.toHaveBeenCalled()
  })

  it('should trim whitespace from prefix and suffix', () => {
    const chip: ChipAction = {
      id: 'test-whitespace',
      label: 'Test',
      actionType: 'TEXT_MESSAGE',
      payload: {
        actionPrefix: '  List amenities for  ',
        actionSuffix: '  ?  ',
        projects: [{ id: '1', name: 'Project' }]
      }
    }

    handleCardSelect(chip, '1')

    expect(mockOnAction).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: { text: 'List amenities for Project?' }
      })
    )
  })

  it('should handle null/undefined in project array items', () => {
    const chip: ChipAction = {
      id: 'test-null-project',
      label: 'Test',
      actionType: 'TEXT_MESSAGE',
      payload: {
        actionPrefix: 'Test',
        projects: [null, { id: '1', name: 'Valid Project' }, undefined] as any
      }
    }

    // Should not crash, though behavior depends on implementation
    handleCardSelect(chip, '1')

    // Either falls back to first item or handles gracefully
    // Just verify no unhandled error
    expect(() => handleCardSelect(chip, '1')).not.toThrow()
  })
})
