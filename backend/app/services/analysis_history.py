"""
Analysis History Service

Tracks user actions and analysis interactions for audit trail and analytics.
"""

import logging
from datetime import datetime, timedelta
from typing import Any

from sqlalchemy import and_, desc
from sqlalchemy.orm import Session

from app.models.ai_analysis import AIAnalysis, AnalysisHistory

logger = logging.getLogger(__name__)


class AnalysisHistoryService:
    """Service for tracking and managing analysis history"""

    def __init__(self, db: Session):
        self.db = db

    def track_action(self, user_id: int, analysis_id: int, action: str,
                    action_details: dict[str, Any] | None = None,
                    user_agent: str | None = None,
                    ip_address: str | None = None,
                    session_id: str | None = None) -> AnalysisHistory:
        """Track a user action on an analysis"""
        try:
            # Get analysis snapshot for important actions
            analysis_snapshot = None
            if action in ['created', 'updated', 'deleted']:
                analysis = self.db.query(AIAnalysis).filter(AIAnalysis.id == analysis_id).first()
                if analysis:
                    analysis_snapshot = {
                        'id': analysis.id,
                        'analysis_type': analysis.analysis_type,
                        'status': analysis.status,
                        'provider_name': analysis.provider_name,
                        'health_data_ids': analysis.health_data_ids,
                        'created_at': analysis.created_at.isoformat(),
                        'completed_at': analysis.completed_at.isoformat() if analysis.completed_at else None
                    }

            history_entry = AnalysisHistory(
                analysis_id=analysis_id,
                user_id=user_id,
                action=action,
                action_details=action_details,
                user_agent=user_agent,
                ip_address=ip_address,
                session_id=session_id,
                analysis_snapshot=analysis_snapshot
            )

            self.db.add(history_entry)
            self.db.commit()
            self.db.refresh(history_entry)

            logger.info(f"Tracked action '{action}' for analysis {analysis_id} by user {user_id}")
            return history_entry

        except Exception as e:
            logger.error(f"Failed to track action '{action}' for analysis {analysis_id}: {str(e)}")
            self.db.rollback()
            # Don't raise exception - history tracking should not break main functionality
            return None

    def track_analysis_created(self, user_id: int, analysis_id: int,
                             creation_details: dict[str, Any] | None = None,
                             request_context: dict[str, str] | None = None) -> AnalysisHistory:
        """Track when an analysis is created"""
        return self.track_action(
            user_id=user_id,
            analysis_id=analysis_id,
            action="created",
            action_details=creation_details,
            user_agent=request_context.get('user_agent') if request_context else None,
            ip_address=request_context.get('ip_address') if request_context else None,
            session_id=request_context.get('session_id') if request_context else None
        )

    def track_analysis_viewed(self, user_id: int, analysis_id: int,
                            view_details: dict[str, Any] | None = None,
                            request_context: dict[str, str] | None = None) -> AnalysisHistory:
        """Track when an analysis is viewed"""
        return self.track_action(
            user_id=user_id,
            analysis_id=analysis_id,
            action="viewed",
            action_details=view_details,
            user_agent=request_context.get('user_agent') if request_context else None,
            ip_address=request_context.get('ip_address') if request_context else None,
            session_id=request_context.get('session_id') if request_context else None
        )

    def track_analysis_shared(self, user_id: int, analysis_id: int,
                            share_details: dict[str, Any],
                            request_context: dict[str, str] | None = None) -> AnalysisHistory:
        """Track when an analysis is shared"""
        return self.track_action(
            user_id=user_id,
            analysis_id=analysis_id,
            action="shared",
            action_details=share_details,
            user_agent=request_context.get('user_agent') if request_context else None,
            ip_address=request_context.get('ip_address') if request_context else None,
            session_id=request_context.get('session_id') if request_context else None
        )

    def track_analysis_deleted(self, user_id: int, analysis_id: int,
                             deletion_details: dict[str, Any] | None = None,
                             request_context: dict[str, str] | None = None) -> AnalysisHistory:
        """Track when an analysis is deleted"""
        return self.track_action(
            user_id=user_id,
            analysis_id=analysis_id,
            action="deleted",
            action_details=deletion_details,
            user_agent=request_context.get('user_agent') if request_context else None,
            ip_address=request_context.get('ip_address') if request_context else None,
            session_id=request_context.get('session_id') if request_context else None
        )

    def get_analysis_history(self, analysis_id: int, user_id: int | None = None) -> list[AnalysisHistory]:
        """Get history for a specific analysis"""
        query = self.db.query(AnalysisHistory).filter(AnalysisHistory.analysis_id == analysis_id)
        if user_id:
            query = query.filter(AnalysisHistory.user_id == user_id)
        return query.order_by(desc(AnalysisHistory.created_at)).all()

    def get_user_history(self, user_id: int, limit: int = 100,
                        action_filter: str | None = None) -> list[AnalysisHistory]:
        """Get history for a specific user"""
        query = self.db.query(AnalysisHistory).filter(AnalysisHistory.user_id == user_id)
        if action_filter:
            query = query.filter(AnalysisHistory.action == action_filter)
        return query.order_by(desc(AnalysisHistory.created_at)).limit(limit).all()

    def get_recent_activity(self, user_id: int, days: int = 7) -> list[AnalysisHistory]:
        """Get recent activity for a user"""
        since_date = datetime.utcnow() - timedelta(days=days)
        return self.db.query(AnalysisHistory).filter(
            and_(
                AnalysisHistory.user_id == user_id,
                AnalysisHistory.created_at >= since_date
            )
        ).order_by(desc(AnalysisHistory.created_at)).all()

    def get_activity_stats(self, user_id: int, days: int = 30) -> dict[str, Any]:
        """Get activity statistics for a user"""
        since_date = datetime.utcnow() - timedelta(days=days)

        # Get all activities in the period
        activities = self.db.query(AnalysisHistory).filter(
            and_(
                AnalysisHistory.user_id == user_id,
                AnalysisHistory.created_at >= since_date
            )
        ).all()

        # Calculate statistics
        total_activities = len(activities)
        action_counts = {}
        daily_activity = {}

        for activity in activities:
            # Count by action type
            action = activity.action
            action_counts[action] = action_counts.get(action, 0) + 1

            # Count by day
            day = activity.created_at.date().isoformat()
            daily_activity[day] = daily_activity.get(day, 0) + 1

        # Get unique analyses accessed
        unique_analyses = len(set(activity.analysis_id for activity in activities))

        return {
            'total_activities': total_activities,
            'unique_analyses_accessed': unique_analyses,
            'action_breakdown': action_counts,
            'daily_activity': daily_activity,
            'period_days': days,
            'most_active_day': max(daily_activity.items(), key=lambda x: x[1])[0] if daily_activity else None
        }

    def get_analysis_interaction_summary(self, analysis_id: int) -> dict[str, Any]:
        """Get interaction summary for a specific analysis"""
        history = self.get_analysis_history(analysis_id)

        if not history:
            return {
                'total_interactions': 0,
                'unique_users': 0,
                'actions': {},
                'first_interaction': None,
                'last_interaction': None
            }

        # Calculate statistics
        total_interactions = len(history)
        unique_users = len(set(h.user_id for h in history))

        action_counts = {}
        for h in history:
            action_counts[h.action] = action_counts.get(h.action, 0) + 1

        first_interaction = min(h.created_at for h in history)
        last_interaction = max(h.created_at for h in history)

        return {
            'total_interactions': total_interactions,
            'unique_users': unique_users,
            'actions': action_counts,
            'first_interaction': first_interaction.isoformat(),
            'last_interaction': last_interaction.isoformat()
        }

    def cleanup_old_history(self, days_to_keep: int = 365) -> int:
        """Clean up old history entries"""
        cutoff_date = datetime.utcnow() - timedelta(days=days_to_keep)

        old_entries = self.db.query(AnalysisHistory).filter(
            AnalysisHistory.created_at < cutoff_date
        ).all()

        count = len(old_entries)
        for entry in old_entries:
            self.db.delete(entry)

        self.db.commit()
        logger.info(f"Cleaned up {count} old history entries older than {days_to_keep} days")
        return count


# Decorator for automatic history tracking
def track_analysis_action(action: str):
    """Decorator to automatically track analysis actions"""
    def decorator(func):
        def wrapper(*args, **kwargs):
            # Execute the original function
            result = func(*args, **kwargs)

            # Try to extract context from function parameters
            # This is a simple implementation - could be enhanced based on actual usage patterns
            try:
                # Look for common parameter names
                user_id = kwargs.get('user_id') or (args[0] if args else None)
                analysis_id = kwargs.get('analysis_id') or result.id if hasattr(result, 'id') else None

                if user_id and analysis_id:
                    # Get database session - this would need to be passed or injected
                    db = kwargs.get('db')
                    if db:
                        history_service = AnalysisHistoryService(db)
                        history_service.track_action(
                            user_id=user_id,
                            analysis_id=analysis_id,
                            action=action,
                            action_details={'function': func.__name__}
                        )
            except Exception as e:
                logger.warning(f"Failed to auto-track action '{action}': {str(e)}")

            return result
        return wrapper
    return decorator


# Service instance factory
def get_analysis_history_service(db: Session) -> AnalysisHistoryService:
    """Get analysis history service instance"""
    return AnalysisHistoryService(db)
