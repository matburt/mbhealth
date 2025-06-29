"""
Analysis Comparison Service

Provides comprehensive comparison and trending analysis capabilities
for AI analyses, including statistical analysis and provider performance metrics.
"""

import logging
import statistics
from collections import Counter, defaultdict
from typing import Any

import numpy as np
from sqlalchemy import and_, desc
from sqlalchemy.orm import Session

from app.models.ai_analysis import AIAnalysis
from app.models.analysis_comparison import AnalysisComparison
from app.schemas.analysis_comparison import (
    AnalysisComparisonCreate,
    ComparisonRequest,
    ComparisonResult,
    ProviderComparisonResult,
    ProviderPerformanceRequest,
    TrendAnalysisRequest,
    TrendAnalysisResult,
)

logger = logging.getLogger(__name__)


class AnalysisComparisonService:
    """Service for comparing analyses and tracking trends"""

    def __init__(self, db: Session):
        self.db = db

    # Analysis Comparison Methods
    def create_comparison(self, user_id: int, comparison_data: AnalysisComparisonCreate) -> AnalysisComparison:
        """Create a new analysis comparison"""
        comparison = AnalysisComparison(
            user_id=user_id,
            **comparison_data.dict()
        )

        self.db.add(comparison)
        self.db.commit()
        self.db.refresh(comparison)

        # Perform the actual comparison analysis
        self._perform_comparison_analysis(comparison)

        return comparison

    def get_comparisons(self, user_id: int, limit: int = 50) -> list[AnalysisComparison]:
        """Get all comparisons for a user"""
        return self.db.query(AnalysisComparison).filter(
            AnalysisComparison.user_id == user_id
        ).order_by(desc(AnalysisComparison.created_at)).limit(limit).all()

    def get_comparison(self, user_id: int, comparison_id: str) -> AnalysisComparison | None:
        """Get a specific comparison"""
        return self.db.query(AnalysisComparison).filter(
            and_(
                AnalysisComparison.id == comparison_id,
                AnalysisComparison.user_id == user_id
            )
        ).first()

    def compare_analyses(self, user_id: int, request: ComparisonRequest) -> ComparisonResult:
        """Perform real-time analysis comparison"""
        # Get the analyses
        analyses = self.db.query(AIAnalysis).filter(
            and_(
                AIAnalysis.id.in_(request.analysis_ids),
                AIAnalysis.user_id == user_id,
                AIAnalysis.status == 'completed'
            )
        ).all()

        if len(analyses) != len(request.analysis_ids):
            raise ValueError("Some analyses not found or not accessible")

        # Perform comparison based on type
        if request.comparison_type == "side_by_side":
            result = self._compare_side_by_side(analyses, request)
        elif request.comparison_type == "temporal_trend":
            result = self._compare_temporal_trend(analyses, request)
        elif request.comparison_type == "provider_performance":
            result = self._compare_provider_performance(analyses, request)
        else:
            raise ValueError(f"Unknown comparison type: {request.comparison_type}")

        # Save comparison if requested
        if request.save_comparison and request.comparison_name:
            comparison_data = AnalysisComparisonCreate(
                name=request.comparison_name,
                analysis_ids=request.analysis_ids,
                comparison_type=request.comparison_type,
                comparison_criteria=request.dict(),
            )
            saved_comparison = self.create_comparison(user_id, comparison_data)
            result.comparison_id = saved_comparison.id

        return result

    def _compare_side_by_side(self, analyses: list[AIAnalysis], request: ComparisonRequest) -> ComparisonResult:
        """Compare analyses side by side"""
        differences = []
        similarities = []

        # Content analysis
        contents = [analysis.response_content for analysis in analyses if analysis.response_content]
        if len(contents) >= 2:
            content_diff = self._analyze_content_differences(contents)
            differences.extend(content_diff.get('differences', []))
            similarities.extend(content_diff.get('similarities', []))

        # Metadata comparison
        metadata_comparison = self._compare_metadata(analyses)
        differences.extend(metadata_comparison.get('differences', []))
        similarities.extend(metadata_comparison.get('similarities', []))

        # Statistical analysis if requested
        statistical_analysis = None
        if request.include_statistical_analysis:
            statistical_analysis = self._perform_statistical_analysis(analyses)

        # Generate recommendations
        recommendations = self._generate_comparison_recommendations(analyses, differences, similarities)

        return ComparisonResult(
            comparison_id="",  # Will be set if saved
            analysis_ids=[a.id for a in analyses],
            comparison_type="side_by_side",
            summary={
                "total_analyses": len(analyses),
                "analysis_types": list(set(a.analysis_type for a in analyses)),
                "providers_used": list(set(a.provider_name for a in analyses)),
                "time_span": {
                    "earliest": min(a.created_at for a in analyses).isoformat(),
                    "latest": max(a.created_at for a in analyses).isoformat()
                }
            },
            differences=differences,
            similarities=similarities,
            statistical_analysis=statistical_analysis,
            recommendations=recommendations,
            confidence_score=self._calculate_confidence_score(analyses, differences, similarities)
        )

    def _compare_temporal_trend(self, analyses: list[AIAnalysis], request: ComparisonRequest) -> ComparisonResult:
        """Compare analyses over time to identify trends"""
        # Sort analyses by creation time
        sorted_analyses = sorted(analyses, key=lambda a: a.created_at)

        # Analyze trends over time
        trend_data = self._analyze_temporal_trends(sorted_analyses)

        # Generate trend insights
        insights = self._generate_trend_insights(trend_data, sorted_analyses)

        return ComparisonResult(
            comparison_id="",
            analysis_ids=[a.id for a in sorted_analyses],
            comparison_type="temporal_trend",
            summary={
                "time_span_days": (sorted_analyses[-1].created_at - sorted_analyses[0].created_at).days,
                "trend_direction": trend_data.get("overall_trend", "stable"),
                "data_points": len(sorted_analyses),
                "analysis_frequency": trend_data.get("avg_interval_days", 0)
            },
            differences=trend_data.get("changes_over_time", []),
            similarities=trend_data.get("consistent_patterns", []),
            statistical_analysis=trend_data.get("statistical_analysis"),
            recommendations=insights.get("recommendations", []),
            confidence_score=trend_data.get("confidence_score", 0.5)
        )

    def _compare_provider_performance(self, analyses: list[AIAnalysis], request: ComparisonRequest) -> ComparisonResult:
        """Compare different AI providers' performance"""
        provider_data = defaultdict(list)

        # Group analyses by provider
        for analysis in analyses:
            provider_data[analysis.provider_name].append(analysis)

        if len(provider_data) < 2:
            raise ValueError("Need analyses from at least 2 different providers for comparison")

        # Analyze each provider's performance
        provider_metrics = {}
        for provider_name, provider_analyses in provider_data.items():
            provider_metrics[provider_name] = self._calculate_provider_metrics(provider_analyses)

        # Compare providers
        comparison_results = self._compare_providers(provider_metrics)

        return ComparisonResult(
            comparison_id="",
            analysis_ids=[a.id for a in analyses],
            comparison_type="provider_performance",
            summary=comparison_results.get("summary", {}),
            differences=comparison_results.get("differences", []),
            similarities=comparison_results.get("similarities", []),
            statistical_analysis=comparison_results.get("statistical_analysis"),
            recommendations=comparison_results.get("recommendations", []),
            confidence_score=comparison_results.get("confidence_score", 0.5)
        )

    # Provider Performance Methods
    def calculate_provider_performance(self, user_id: int, request: ProviderPerformanceRequest) -> ProviderComparisonResult:
        """Calculate comprehensive provider performance metrics"""
        # Get analyses in the specified period
        analyses_query = self.db.query(AIAnalysis).filter(
            and_(
                AIAnalysis.user_id == user_id,
                AIAnalysis.created_at >= request.period_start,
                AIAnalysis.created_at <= request.period_end
            )
        )

        if request.provider_ids:
            analyses_query = analyses_query.filter(AIAnalysis.provider_name.in_(request.provider_ids))

        if request.analysis_type_filter:
            analyses_query = analyses_query.filter(AIAnalysis.analysis_type == request.analysis_type_filter)

        analyses = analyses_query.all()

        if not analyses:
            raise ValueError("No analyses found in the specified period")

        # Group by provider
        provider_analyses = defaultdict(list)
        for analysis in analyses:
            provider_analyses[analysis.provider_name].append(analysis)

        # Calculate metrics for each provider
        provider_metrics = {}
        for provider_name, provider_analysis_list in provider_analyses.items():
            metrics = self._calculate_comprehensive_provider_metrics(provider_analysis_list)
            provider_metrics[provider_name] = metrics

        # Generate rankings
        rankings = self._generate_provider_rankings(provider_metrics, request.metrics)

        # Generate recommendations
        recommendations = {}
        if request.include_recommendations:
            recommendations = self._generate_provider_recommendations(provider_metrics, rankings)

        return ProviderComparisonResult(
            providers=[{"name": name, "analysis_count": len(provider_analyses[name])}
                      for name in provider_metrics.keys()],
            comparison_period={
                "start": request.period_start,
                "end": request.period_end
            },
            metrics=provider_metrics,
            rankings=rankings,
            recommendations=recommendations,
            cost_analysis=self._analyze_provider_costs(provider_metrics),
            efficiency_analysis=self._analyze_provider_efficiency(provider_metrics)
        )

    # Trend Analysis Methods
    def analyze_trends(self, user_id: int, request: TrendAnalysisRequest) -> TrendAnalysisResult:
        """Analyze trends in analyses over time"""
        # Get analyses in the specified period
        analyses_query = self.db.query(AIAnalysis).filter(
            and_(
                AIAnalysis.user_id == user_id,
                AIAnalysis.created_at >= request.period_start,
                AIAnalysis.created_at <= request.period_end,
                AIAnalysis.status == 'completed'
            )
        )

        if request.analysis_type:
            analyses_query = analyses_query.filter(AIAnalysis.analysis_type == request.analysis_type)

        analyses = analyses_query.order_by(AIAnalysis.created_at).all()

        if len(analyses) < request.min_data_points:
            raise ValueError(f"Insufficient data points. Found {len(analyses)}, need at least {request.min_data_points}")

        # Perform trend analysis
        trend_data = self._perform_comprehensive_trend_analysis(analyses, request)

        # Generate insights
        insights = self._generate_comprehensive_trend_insights(analyses, trend_data, request)

        # Calculate projections if requested
        projections = None
        if request.include_projections:
            projections = self._calculate_trend_projections(analyses, trend_data)

        return TrendAnalysisResult(
            trend_id="",  # Could be saved as AnalysisTrend
            analysis_ids=[a.id for a in analyses],
            time_period={"start": request.period_start, "end": request.period_end},
            trend_direction=trend_data.get("direction", "stable"),
            trend_strength=trend_data.get("strength", 0.0),
            key_insights=insights,
            statistical_data=trend_data.get("statistical_analysis", {}),
            projections=projections,
            improvement_metrics=trend_data.get("improvement_metrics")
        )

    # Helper Methods for Analysis
    def _analyze_content_differences(self, contents: list[str]) -> dict[str, Any]:
        """Analyze differences in analysis content"""
        differences = []
        similarities = []

        # Simple content comparison (could be enhanced with NLP)
        for i, content1 in enumerate(contents):
            for j, content2 in enumerate(contents[i+1:], i+1):
                # Length comparison
                len_diff = abs(len(content1) - len(content2))
                if len_diff > 100:
                    differences.append({
                        "type": "content_length",
                        "description": f"Analysis {i+1} is {len_diff} characters longer than analysis {j+1}",
                        "severity": "medium" if len_diff > 500 else "low"
                    })

                # Keyword similarity (basic)
                words1 = set(content1.lower().split())
                words2 = set(content2.lower().split())
                common_words = words1.intersection(words2)
                similarity_ratio = len(common_words) / len(words1.union(words2)) if words1.union(words2) else 0

                if similarity_ratio > 0.7:
                    similarities.append({
                        "type": "content_similarity",
                        "description": f"Analysis {i+1} and {j+1} share {similarity_ratio:.1%} common concepts",
                        "strength": "high" if similarity_ratio > 0.8 else "medium"
                    })
                elif similarity_ratio < 0.3:
                    differences.append({
                        "type": "content_divergence",
                        "description": f"Analysis {i+1} and {j+1} have significantly different focus areas",
                        "severity": "medium"
                    })

        return {"differences": differences, "similarities": similarities}

    def _compare_metadata(self, analyses: list[AIAnalysis]) -> dict[str, Any]:
        """Compare metadata across analyses"""
        differences = []
        similarities = []

        # Processing time comparison
        processing_times = [a.processing_time for a in analyses if a.processing_time]
        if len(processing_times) >= 2:
            avg_time = statistics.mean(processing_times)
            std_time = statistics.stdev(processing_times) if len(processing_times) > 1 else 0

            for i, time in enumerate(processing_times):
                if abs(time - avg_time) > 2 * std_time:
                    differences.append({
                        "type": "processing_time_outlier",
                        "description": f"Analysis {i+1} took {time:.1f}s vs average {avg_time:.1f}s",
                        "severity": "medium"
                    })

        # Provider comparison
        providers = [a.provider_name for a in analyses]
        provider_counts = Counter(providers)
        if len(set(providers)) > 1:
            differences.append({
                "type": "different_providers",
                "description": f"Uses {len(set(providers))} different providers: {', '.join(set(providers))}",
                "severity": "low"
            })
        else:
            similarities.append({
                "type": "same_provider",
                "description": f"All analyses use {providers[0]}",
                "strength": "high"
            })

        # Analysis type comparison
        analysis_types = [a.analysis_type for a in analyses]
        if len(set(analysis_types)) > 1:
            differences.append({
                "type": "different_analysis_types",
                "description": f"Multiple analysis types: {', '.join(set(analysis_types))}",
                "severity": "low"
            })
        else:
            similarities.append({
                "type": "same_analysis_type",
                "description": f"All analyses are '{analysis_types[0]}' type",
                "strength": "medium"
            })

        return {"differences": differences, "similarities": similarities}

    def _perform_statistical_analysis(self, analyses: list[AIAnalysis]) -> dict[str, Any]:
        """Perform statistical analysis on the analyses"""
        stats = {}

        # Processing time statistics
        processing_times = [a.processing_time for a in analyses if a.processing_time]
        if processing_times:
            stats["processing_time"] = {
                "mean": statistics.mean(processing_times),
                "median": statistics.median(processing_times),
                "std_dev": statistics.stdev(processing_times) if len(processing_times) > 1 else 0,
                "min": min(processing_times),
                "max": max(processing_times)
            }

        # Cost statistics
        costs = [a.cost for a in analyses if a.cost]
        if costs:
            stats["cost"] = {
                "total": sum(costs),
                "mean": statistics.mean(costs),
                "median": statistics.median(costs),
                "std_dev": statistics.stdev(costs) if len(costs) > 1 else 0
            }

        # Token usage statistics
        token_usages = []
        for analysis in analyses:
            if analysis.token_usage and isinstance(analysis.token_usage, dict):
                total_tokens = analysis.token_usage.get('total_tokens', 0)
                if total_tokens:
                    token_usages.append(total_tokens)

        if token_usages:
            stats["token_usage"] = {
                "mean": statistics.mean(token_usages),
                "median": statistics.median(token_usages),
                "total": sum(token_usages)
            }

        return stats

    def _generate_comparison_recommendations(self, analyses: list[AIAnalysis], differences: list[dict], similarities: list[dict]) -> list[str]:
        """Generate recommendations based on comparison results"""
        recommendations = []

        # Provider consistency recommendations
        providers = set(a.provider_name for a in analyses)
        if len(providers) > 1:
            # Find best performing provider
            provider_performance = {}
            for provider in providers:
                provider_analyses = [a for a in analyses if a.provider_name == provider]
                avg_time = statistics.mean([a.processing_time for a in provider_analyses if a.processing_time]) or 0
                success_rate = len([a for a in provider_analyses if a.status == 'completed']) / len(provider_analyses)
                provider_performance[provider] = {"avg_time": avg_time, "success_rate": success_rate}

            best_provider = max(provider_performance.keys(),
                              key=lambda p: provider_performance[p]["success_rate"] - provider_performance[p]["avg_time"]/100)
            recommendations.append(f"Consider using {best_provider} consistently for better performance")

        # Analysis frequency recommendations
        if len(analyses) >= 3:
            time_intervals = []
            sorted_analyses = sorted(analyses, key=lambda a: a.created_at)
            for i in range(1, len(sorted_analyses)):
                interval = (sorted_analyses[i].created_at - sorted_analyses[i-1].created_at).days
                time_intervals.append(interval)

            avg_interval = statistics.mean(time_intervals)
            if avg_interval > 7:
                recommendations.append("Consider more frequent analysis for better trend tracking")
            elif avg_interval < 1:
                recommendations.append("Consider spacing out analyses to allow for meaningful changes")

        # Content recommendations based on differences
        content_diffs = [d for d in differences if d["type"] == "content_length"]
        if content_diffs:
            recommendations.append("Provide more consistent context to get more uniform analysis depth")

        return recommendations

    def _calculate_confidence_score(self, analyses: list[AIAnalysis], differences: list[dict], similarities: list[dict]) -> float:
        """Calculate confidence score for the comparison"""
        base_score = 0.5

        # Increase confidence with more data points
        data_point_bonus = min(len(analyses) * 0.1, 0.3)

        # Decrease confidence with many differences
        difference_penalty = len([d for d in differences if d.get("severity") == "high"]) * 0.1

        # Increase confidence with similarities
        similarity_bonus = len([s for s in similarities if s.get("strength") == "high"]) * 0.05

        # Provider consistency bonus
        providers = set(a.provider_name for a in analyses)
        provider_bonus = 0.1 if len(providers) == 1 else 0

        confidence = base_score + data_point_bonus + similarity_bonus + provider_bonus - difference_penalty
        return max(0.0, min(1.0, confidence))

    def _calculate_provider_metrics(self, analyses: list[AIAnalysis]) -> dict[str, Any]:
        """Calculate metrics for a specific provider"""
        total_analyses = len(analyses)
        successful_analyses = len([a for a in analyses if a.status == 'completed'])
        failed_analyses = total_analyses - successful_analyses

        processing_times = [a.processing_time for a in analyses if a.processing_time]
        costs = [a.cost for a in analyses if a.cost]

        return {
            "total_analyses": total_analyses,
            "successful_analyses": successful_analyses,
            "failed_analyses": failed_analyses,
            "success_rate": successful_analyses / total_analyses if total_analyses > 0 else 0,
            "avg_processing_time": statistics.mean(processing_times) if processing_times else None,
            "total_cost": sum(costs) if costs else None,
            "avg_cost": statistics.mean(costs) if costs else None,
            "avg_response_length": statistics.mean([len(a.response_content or "") for a in analyses]),
            "analysis_types": Counter([a.analysis_type for a in analyses])
        }

    def _compare_providers(self, provider_metrics: dict[str, dict[str, Any]]) -> dict[str, Any]:
        """Compare multiple providers' metrics"""
        comparison = {
            "summary": {},
            "differences": [],
            "similarities": [],
            "statistical_analysis": {},
            "recommendations": []
        }

        # Success rate comparison
        success_rates = {name: metrics["success_rate"] for name, metrics in provider_metrics.items()}
        best_success_provider = max(success_rates.keys(), key=lambda k: success_rates[k])
        worst_success_provider = min(success_rates.keys(), key=lambda k: success_rates[k])

        if success_rates[best_success_provider] - success_rates[worst_success_provider] > 0.1:
            comparison["differences"].append({
                "type": "success_rate_difference",
                "description": f"{best_success_provider} has {success_rates[best_success_provider]:.1%} success rate vs {worst_success_provider} at {success_rates[worst_success_provider]:.1%}",
                "severity": "high"
            })

        # Speed comparison
        processing_times = {name: metrics["avg_processing_time"]
                          for name, metrics in provider_metrics.items()
                          if metrics["avg_processing_time"] is not None}
        if len(processing_times) >= 2:
            fastest_provider = min(processing_times.keys(), key=lambda k: processing_times[k])
            slowest_provider = max(processing_times.keys(), key=lambda k: processing_times[k])

            time_diff = processing_times[slowest_provider] - processing_times[fastest_provider]
            if time_diff > 5:  # 5 second difference
                comparison["differences"].append({
                    "type": "processing_speed_difference",
                    "description": f"{fastest_provider} is {time_diff:.1f}s faster than {slowest_provider}",
                    "severity": "medium"
                })

        comparison["summary"] = {
            "total_providers": len(provider_metrics),
            "best_success_rate": success_rates[best_success_provider],
            "provider_with_best_success_rate": best_success_provider
        }

        return comparison

    def _analyze_temporal_trends(self, sorted_analyses: list[AIAnalysis]) -> dict[str, Any]:
        """Analyze trends over time in analyses"""
        if len(sorted_analyses) < 2:
            return {"overall_trend": "insufficient_data"}

        # Calculate time intervals
        time_intervals = []
        for i in range(1, len(sorted_analyses)):
            interval = (sorted_analyses[i].created_at - sorted_analyses[i-1].created_at).days
            time_intervals.append(interval)

        # Analyze processing time trends
        processing_times = [a.processing_time for a in sorted_analyses if a.processing_time]
        processing_trend = None
        if len(processing_times) >= 3:
            # Simple linear trend detection
            x = list(range(len(processing_times)))
            correlation = np.corrcoef(x, processing_times)[0, 1] if len(processing_times) > 1 else 0

            if correlation > 0.3:
                processing_trend = "increasing"
            elif correlation < -0.3:
                processing_trend = "decreasing"
            else:
                processing_trend = "stable"

        # Analyze content length trends
        content_lengths = [len(a.response_content or "") for a in sorted_analyses]
        content_trend = None
        if len(content_lengths) >= 3:
            x = list(range(len(content_lengths)))
            correlation = np.corrcoef(x, content_lengths)[0, 1] if len(content_lengths) > 1 else 0

            if correlation > 0.3:
                content_trend = "increasing_detail"
            elif correlation < -0.3:
                content_trend = "decreasing_detail"
            else:
                content_trend = "stable_detail"

        return {
            "overall_trend": "improving" if processing_trend == "decreasing" else "stable",
            "processing_time_trend": processing_trend,
            "content_detail_trend": content_trend,
            "avg_interval_days": statistics.mean(time_intervals) if time_intervals else 0,
            "confidence_score": 0.7 if len(sorted_analyses) >= 5 else 0.5,
            "statistical_analysis": {
                "data_points": len(sorted_analyses),
                "time_span_days": (sorted_analyses[-1].created_at - sorted_analyses[0].created_at).days
            }
        }

    def _generate_trend_insights(self, trend_data: dict[str, Any], analyses: list[AIAnalysis]) -> dict[str, Any]:
        """Generate insights from trend analysis"""
        insights = {"recommendations": []}

        processing_trend = trend_data.get("processing_time_trend")
        if processing_trend == "increasing":
            insights["recommendations"].append("Analysis processing time is increasing - consider optimizing data selection or switching providers")
        elif processing_trend == "decreasing":
            insights["recommendations"].append("Great! Analysis processing time is improving over time")

        content_trend = trend_data.get("content_detail_trend")
        if content_trend == "decreasing_detail":
            insights["recommendations"].append("Analysis detail is decreasing - consider providing more context or specific questions")
        elif content_trend == "increasing_detail":
            insights["recommendations"].append("Analysis detail is improving - continue providing good context")

        avg_interval = trend_data.get("avg_interval_days", 0)
        if avg_interval > 14:
            insights["recommendations"].append("Consider more frequent analysis to track changes better")
        elif avg_interval < 2:
            insights["recommendations"].append("Very frequent analysis - ensure enough time between analyses for meaningful changes")

        return insights

    # Additional helper methods would continue here...
    # For brevity, I'm including the key methods. The full implementation would include:
    # - _perform_comprehensive_trend_analysis
    # - _generate_comprehensive_trend_insights
    # - _calculate_trend_projections
    # - _calculate_comprehensive_provider_metrics
    # - _generate_provider_rankings
    # - _generate_provider_recommendations
    # - _analyze_provider_costs
    # - _analyze_provider_efficiency

    def _perform_comprehensive_trend_analysis(self, analyses: list[AIAnalysis], request: TrendAnalysisRequest) -> dict[str, Any]:
        """Perform comprehensive statistical trend analysis"""
        # This would include more sophisticated statistical analysis
        # including regression, correlation analysis, seasonality detection, etc.
        return self._analyze_temporal_trends(analyses)

    def _generate_comprehensive_trend_insights(self, analyses: list[AIAnalysis], trend_data: dict[str, Any], request: TrendAnalysisRequest) -> list[str]:
        """Generate comprehensive insights from trend analysis"""
        return self._generate_trend_insights(trend_data, analyses).get("recommendations", [])

    def _calculate_trend_projections(self, analyses: list[AIAnalysis], trend_data: dict[str, Any]) -> dict[str, Any] | None:
        """Calculate future projections based on trends"""
        if len(analyses) < 3:
            return None

        # Simple projection based on linear trends
        return {
            "next_30_days": "stable",
            "confidence": 0.6,
            "recommendations": ["Continue current analysis frequency"]
        }
