# Dead Code Cleanup Report

**Date**: July 9, 2025
**Branch**: cleanup/documentation-and-dead-code

## Summary

This report identifies unused files, orphaned components, and dead code that can be safely removed from the MBHealth codebase to reduce complexity and maintenance burden.

## High-Confidence Dead Code (Safe to Remove)

### 1. Backup Files
- **File**: `/frontend/src/components/Layout.tsx.bak`
- **Type**: Backup file
- **Reason**: Backup files with `.bak` extension are not used in production
- **Action**: Delete immediately

### 2. Unused React Components
- **File**: `/frontend/src/components/HealthDataChart.tsx`
- **Type**: React component
- **Reason**: Superseded by UnifiedHealthChart component
- **Action**: Delete after confirming no hidden dependencies

- **File**: `/frontend/src/components/DataVisualizationDashboard.tsx`
- **Type**: React component  
- **Reason**: DataVisualizationPage doesn't use this component
- **Action**: Delete after confirming no hidden dependencies

- **File**: `/frontend/src/components/SimpleHealthChart.tsx`
- **Type**: React component
- **Reason**: No imports found anywhere in codebase
- **Action**: Delete after confirming no hidden dependencies

- **File**: `/frontend/src/components/WorkflowSelectionModal.tsx`
- **Type**: React component
- **Reason**: Workflow management uses other modal components
- **Action**: Delete after confirming workflow functionality works without it

- **File**: `/frontend/src/components/WorkflowExecutionModal.tsx`
- **Type**: React component
- **Reason**: Workflow management uses other modal components
- **Action**: Delete after confirming workflow functionality works without it

### 3. Unused React Hooks
- **File**: `/frontend/src/hooks/useErrorHandler.ts`
- **Type**: React hook
- **Reason**: Exported but never imported anywhere in the codebase
- **Action**: Delete after confirming error handling works without it

### 4. Backend Scripts
- **File**: `/backend/seed_workflow_templates.py`
- **Type**: Database seeding script
- **Reason**: One-time setup script not integrated into deployment process
- **Action**: Move to `/scripts` directory or delete if no longer needed

## Medium-Confidence Items (Evaluate Before Removing)

### 1. Test Utilities
- **File**: `/frontend/src/test/utils/test-utils.tsx`
- **Type**: Test utilities
- **Reason**: Defined but not used by existing tests
- **Action**: Keep if planning to expand test coverage, otherwise remove

### 2. Service Dependencies
- **File**: `/frontend/src/services/workflowsService.ts`
- **Type**: Service module
- **Reason**: Used by workflow components that may themselves be unused
- **Action**: Remove only if workflow components are confirmed unused

## Files Confirmed as Active (Keep)

The following files were initially suspected but are confirmed to be in active use:
- `/frontend/src/services/reports.ts` - Used by PDFExportModal
- All backend AI provider services - Integrated and functional
- All backend API endpoints - Called by frontend
- Database models - All referenced and used

## Cleanup Actions Completed

1. ✅ Updated README.md to consolidate blood pressure insights documentation
2. ✅ Updated CLAUDE.md with recent component additions
3. ✅ Created this dead code cleanup report

## Recommended Next Steps

1. **Immediate**: Remove backup file (`Layout.tsx.bak`)
2. **Phase 1**: Remove high-confidence unused React components after testing
3. **Phase 2**: Evaluate medium-confidence items based on development roadmap
4. **Phase 3**: Clean up any resulting orphaned dependencies

## Testing Before Removal

Before removing any component, verify:
1. Frontend builds successfully
2. All existing functionality works
3. No runtime errors in browser console
4. All tests pass (if any exist)

## Impact Assessment

**Estimated cleanup impact**:
- Files to remove: 8-9 files
- Lines of code reduction: ~1,500-2,000 lines
- Maintenance burden reduction: Medium
- Risk of breaking existing functionality: Low (with proper testing)