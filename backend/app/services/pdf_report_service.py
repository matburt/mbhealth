"""
PDF Report Generation Service for Health Data Visualization

This service generates professional medical reports from health data visualizations
suitable for sharing with healthcare providers.
"""

import io
import tempfile
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional, Tuple
from pathlib import Path

import matplotlib
# Use non-interactive backend for server-side rendering
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.dates as mdates
import seaborn as sns
import pandas as pd
import numpy as np
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, A4
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch, cm
from jinja2 import Template

from app.models.user import User
from app.models.health_data import HealthData
from app.core.database import get_db


class PDFReportService:
    """Service for generating PDF reports from health data visualizations."""
    
    def __init__(self):
        self.styles = getSampleStyleSheet()
        self._setup_custom_styles()
        
    def _setup_custom_styles(self):
        """Set up custom paragraph styles for medical reports."""
        # Header style
        self.styles.add(ParagraphStyle(
            name='MedicalHeader',
            parent=self.styles['Heading1'],
            fontSize=16,
            spaceAfter=20,
            textColor=colors.navy,
            alignment=1  # Center alignment
        ))
        
        # Subheader style
        self.styles.add(ParagraphStyle(
            name='MedicalSubHeader',
            parent=self.styles['Heading2'],
            fontSize=14,
            spaceBefore=15,
            spaceAfter=10,
            textColor=colors.darkblue
        ))
        
        # Patient info style
        self.styles.add(ParagraphStyle(
            name='PatientInfo',
            parent=self.styles['Normal'],
            fontSize=11,
            spaceAfter=5,
            leftIndent=20
        ))
        
        # Summary style
        self.styles.add(ParagraphStyle(
            name='Summary',
            parent=self.styles['Normal'],
            fontSize=10,
            spaceAfter=8,
            leftIndent=10,
            backgroundColor=colors.lightgrey
        ))

    async def generate_health_report(
        self,
        user_id: int,
        health_data: List[HealthData],
        date_range: Tuple[datetime, datetime],
        metric_types: Optional[List[str]] = None,
        include_charts: bool = True,
        include_summary: bool = True,
        include_trends: bool = True,
        db_session=None
    ) -> bytes:
        """
        Generate a comprehensive PDF health report.
        
        Args:
            user_id: ID of the user
            health_data: List of health data records
            date_range: Tuple of (start_date, end_date)
            metric_types: Optional list of metric types to include
            include_charts: Whether to include data visualization charts
            include_summary: Whether to include statistical summary
            include_trends: Whether to include trend analysis
            
        Returns:
            bytes: PDF document as bytes
        """
        # Create PDF buffer
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=2*cm,
            leftMargin=2*cm,
            topMargin=2*cm,
            bottomMargin=2*cm
        )
        
        # Build report content
        story = []
        
        # Get user information
        user = await self._get_user_info(user_id, db_session)
        
        # Add header
        story.extend(self._build_header(user, date_range))
        
        # Add patient information
        story.extend(self._build_patient_info(user))
        
        # Add executive summary
        if include_summary:
            story.extend(self._build_executive_summary(health_data, date_range))
        
        # Process data by metric type
        if metric_types is None:
            metric_types = list(set(data.metric_type for data in health_data))
        
        for metric_type in metric_types:
            metric_data = [d for d in health_data if d.metric_type == metric_type]
            if not metric_data:
                continue
                
            story.append(Spacer(1, 20))
            story.extend(self._build_metric_section(
                metric_type, 
                metric_data, 
                include_charts, 
                include_trends
            ))
        
        # Add conclusions and recommendations
        story.extend(self._build_conclusions(health_data, metric_types))
        
        # Add footer information
        story.extend(self._build_footer())
        
        # Build PDF
        doc.build(story)
        
        # Return PDF bytes
        buffer.seek(0)
        return buffer.getvalue()

    async def _get_user_info(self, user_id: int, db_session=None) -> User:
        """Get user information from database."""
        if db_session:
            user = db_session.query(User).filter(User.id == user_id).first()
            if user:
                return user
        
        # Fallback to creating a basic user object if no session provided
        return User(
            id=user_id,
            full_name="Patient",
            email="patient@example.com",
            username="patient_user"
        )

    def _build_header(self, user: User, date_range: Tuple[datetime, datetime]) -> List:
        """Build report header section."""
        elements = []
        
        # Main title
        title = Paragraph("Health Data Analysis Report", self.styles['MedicalHeader'])
        elements.append(title)
        elements.append(Spacer(1, 10))
        
        # Report metadata
        report_date = datetime.now().strftime("%B %d, %Y")
        period = f"{date_range[0].strftime('%B %d, %Y')} - {date_range[1].strftime('%B %d, %Y')}"
        
        metadata_data = [
            ["Report Generated:", report_date],
            ["Data Period:", period],
            ["Report Type:", "Comprehensive Health Analysis"]
        ]
        
        metadata_table = Table(metadata_data, colWidths=[4*cm, 8*cm])
        metadata_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('BACKGROUND', (0, 0), (0, -1), colors.lightgrey)
        ]))
        
        elements.append(metadata_table)
        elements.append(Spacer(1, 20))
        
        return elements

    def _build_patient_info(self, user: User) -> List:
        """Build patient information section."""
        elements = []
        
        elements.append(Paragraph("Patient Information", self.styles['MedicalSubHeader']))
        
        patient_data = [
            ["Patient Name:", user.full_name or "Not provided"],
            ["Patient ID:", str(user.id)],
            ["Email:", user.email],
            ["Report Access Level:", "Patient Self-Generated"]
        ]
        
        patient_table = Table(patient_data, colWidths=[4*cm, 8*cm])
        patient_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('BACKGROUND', (0, 0), (0, -1), colors.lightblue),
            ('VALIGN', (0, 0), (-1, -1), 'TOP')
        ]))
        
        elements.append(patient_table)
        elements.append(Spacer(1, 15))
        
        return elements

    def _build_executive_summary(self, health_data: List[HealthData], date_range: Tuple[datetime, datetime]) -> List:
        """Build executive summary section."""
        elements = []
        
        elements.append(Paragraph("Executive Summary", self.styles['MedicalSubHeader']))
        
        # Calculate summary statistics
        total_readings = len(health_data)
        unique_metrics = len(set(data.metric_type for data in health_data))
        date_span = (date_range[1] - date_range[0]).days
        
        summary_text = f"""
        This report contains {total_readings} health measurements across {unique_metrics} different metrics 
        collected over a {date_span}-day period. The data includes automated trend analysis, 
        statistical summaries, and clinical reference comparisons where applicable.
        
        Key metrics analyzed: {', '.join(set(data.metric_type.replace('_', ' ').title() for data in health_data))}
        
        All measurements are patient-reported and should be reviewed in conjunction with 
        professional medical examination and clinical assessment.
        """
        
        elements.append(Paragraph(summary_text, self.styles['Summary']))
        elements.append(Spacer(1, 15))
        
        return elements

    def _build_metric_section(self, metric_type: str, metric_data: List[HealthData], include_charts: bool, include_trends: bool) -> List:
        """Build a section for a specific metric type."""
        elements = []
        
        # Section header
        metric_title = metric_type.replace('_', ' ').title()
        elements.append(Paragraph(f"{metric_title} Analysis", self.styles['MedicalSubHeader']))
        
        # Statistical summary
        stats = self._calculate_statistics(metric_data)
        elements.extend(self._build_statistics_table(metric_type, stats))
        
        # Generate and add chart if requested
        if include_charts and len(metric_data) > 1:
            chart_image = self._generate_metric_chart(metric_type, metric_data)
            if chart_image:
                elements.append(Spacer(1, 10))
                elements.append(chart_image)
        
        # Add trend analysis if requested
        if include_trends and len(metric_data) > 2:
            trend_analysis = self._analyze_trends(metric_data)
            elements.append(Spacer(1, 10))
            elements.append(Paragraph("Trend Analysis:", self.styles['Heading3']))
            elements.append(Paragraph(trend_analysis, self.styles['Normal']))
        
        # Add clinical notes if applicable
        clinical_notes = self._get_clinical_notes(metric_type, stats)
        if clinical_notes:
            elements.append(Spacer(1, 10))
            elements.append(Paragraph("Clinical Notes:", self.styles['Heading3']))
            elements.append(Paragraph(clinical_notes, self.styles['Normal']))
        
        return elements

    def _calculate_statistics(self, metric_data: List[HealthData]) -> Dict[str, Any]:
        """Calculate statistical summary for metric data."""
        if metric_data[0].metric_type == 'blood_pressure':
            systolic_values = [d.systolic for d in metric_data if d.systolic is not None]
            diastolic_values = [d.diastolic for d in metric_data if d.diastolic is not None]
            
            return {
                'count': len(metric_data),
                'systolic_mean': np.mean(systolic_values) if systolic_values else 0,
                'systolic_std': np.std(systolic_values) if systolic_values else 0,
                'systolic_min': np.min(systolic_values) if systolic_values else 0,
                'systolic_max': np.max(systolic_values) if systolic_values else 0,
                'diastolic_mean': np.mean(diastolic_values) if diastolic_values else 0,
                'diastolic_std': np.std(diastolic_values) if diastolic_values else 0,
                'diastolic_min': np.min(diastolic_values) if diastolic_values else 0,
                'diastolic_max': np.max(diastolic_values) if diastolic_values else 0,
                'unit': metric_data[0].unit
            }
        else:
            values = [d.value for d in metric_data if d.value is not None]
            
            return {
                'count': len(metric_data),
                'mean': np.mean(values) if values else 0,
                'std': np.std(values) if values else 0,
                'min': np.min(values) if values else 0,
                'max': np.max(values) if values else 0,
                'median': np.median(values) if values else 0,
                'unit': metric_data[0].unit
            }

    def _build_statistics_table(self, metric_type: str, stats: Dict[str, Any]) -> List:
        """Build statistics table for a metric."""
        elements = []
        
        if metric_type == 'blood_pressure':
            data = [
                ["Metric", "Systolic", "Diastolic", "Unit"],
                ["Average", f"{stats['systolic_mean']:.1f}", f"{stats['diastolic_mean']:.1f}", stats['unit']],
                ["Std Dev", f"{stats['systolic_std']:.1f}", f"{stats['diastolic_std']:.1f}", stats['unit']],
                ["Minimum", f"{stats['systolic_min']:.1f}", f"{stats['diastolic_min']:.1f}", stats['unit']],
                ["Maximum", f"{stats['systolic_max']:.1f}", f"{stats['diastolic_max']:.1f}", stats['unit']],
                ["Readings", str(stats['count']), str(stats['count']), "count"]
            ]
        else:
            data = [
                ["Metric", "Value", "Unit"],
                ["Average", f"{stats['mean']:.2f}", stats['unit']],
                ["Std Dev", f"{stats['std']:.2f}", stats['unit']],
                ["Median", f"{stats['median']:.2f}", stats['unit']],
                ["Minimum", f"{stats['min']:.2f}", stats['unit']],
                ["Maximum", f"{stats['max']:.2f}", stats['unit']],
                ["Readings", str(stats['count']), "count"]
            ]
        
        table = Table(data)
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 12),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        
        elements.append(table)
        return elements

    def _generate_metric_chart(self, metric_type: str, metric_data: List[HealthData]) -> Optional[Image]:
        """Generate a chart for the metric data."""
        try:
            # Create figure
            fig, ax = plt.subplots(figsize=(10, 6))
            
            # Prepare data
            dates = [d.recorded_at for d in metric_data]
            dates = sorted(dates)
            
            if metric_type == 'blood_pressure':
                systolic_data = [(d.recorded_at, d.systolic) for d in metric_data if d.systolic is not None]
                diastolic_data = [(d.recorded_at, d.diastolic) for d in metric_data if d.diastolic is not None]
                
                if systolic_data:
                    sys_dates, sys_values = zip(*sorted(systolic_data))
                    ax.plot(sys_dates, sys_values, 'r-o', label='Systolic', linewidth=2, markersize=4)
                
                if diastolic_data:
                    dia_dates, dia_values = zip(*sorted(diastolic_data))
                    ax.plot(dia_dates, dia_values, 'b-o', label='Diastolic', linewidth=2, markersize=4)
                
                # Add reference lines
                ax.axhline(y=140, color='red', linestyle='--', alpha=0.7, label='High BP Threshold')
                ax.axhline(y=90, color='orange', linestyle='--', alpha=0.7, label='High Diastolic Threshold')
                
                ax.set_ylabel(f'Blood Pressure ({metric_data[0].unit})')
                
            else:
                value_data = [(d.recorded_at, d.value) for d in metric_data if d.value is not None]
                if value_data:
                    dates, values = zip(*sorted(value_data))
                    ax.plot(dates, values, 'g-o', linewidth=2, markersize=4)
                
                ax.set_ylabel(f'{metric_type.replace("_", " ").title()} ({metric_data[0].unit})')
            
            # Format chart
            ax.set_xlabel('Date')
            ax.set_title(f'{metric_type.replace("_", " ").title()} Over Time', fontsize=14, fontweight='bold')
            ax.grid(True, alpha=0.3)
            ax.legend()
            
            # Format dates on x-axis
            if len(dates) > 10:
                ax.xaxis.set_major_locator(mdates.WeekdayLocator())
                ax.xaxis.set_major_formatter(mdates.DateFormatter('%m/%d'))
            else:
                ax.xaxis.set_major_formatter(mdates.DateFormatter('%m/%d'))
            
            plt.xticks(rotation=45)
            plt.tight_layout()
            
            # Save to BytesIO
            img_buffer = io.BytesIO()
            plt.savefig(img_buffer, format='png', dpi=300, bbox_inches='tight')
            img_buffer.seek(0)
            plt.close(fig)  # Important: close figure to free memory
            
            # Create ReportLab Image
            img = Image(img_buffer, width=15*cm, height=9*cm)
            return img
            
        except Exception as e:
            print(f"Error generating chart for {metric_type}: {e}")
            plt.close('all')  # Ensure all figures are closed
            return None

    def _analyze_trends(self, metric_data: List[HealthData]) -> str:
        """Analyze trends in metric data."""
        if len(metric_data) < 3:
            return "Insufficient data for trend analysis."
        
        # Sort by date
        sorted_data = sorted(metric_data, key=lambda x: x.recorded_at)
        
        if metric_data[0].metric_type == 'blood_pressure':
            # Analyze both systolic and diastolic trends
            systolic_values = [d.systolic for d in sorted_data if d.systolic is not None]
            diastolic_values = [d.diastolic for d in sorted_data if d.diastolic is not None]
            
            sys_trend = self._calculate_trend(systolic_values)
            dia_trend = self._calculate_trend(diastolic_values)
            
            return f"Systolic pressure shows a {sys_trend} trend. Diastolic pressure shows a {dia_trend} trend. " \
                   f"Recent readings should be evaluated against clinical guidelines and patient history."
        else:
            values = [d.value for d in sorted_data if d.value is not None]
            trend = self._calculate_trend(values)
            
            return f"Data shows a {trend} trend over the analyzed period. " \
                   f"Consider clinical context and patient-specific factors when interpreting these results."

    def _calculate_trend(self, values: List[float]) -> str:
        """Calculate trend direction from a list of values."""
        if len(values) < 3:
            return "stable"
        
        # Simple linear regression to determine trend
        x = np.arange(len(values))
        slope = np.polyfit(x, values, 1)[0]
        
        if abs(slope) < 0.1:
            return "stable"
        elif slope > 0:
            return "increasing"
        else:
            return "decreasing"

    def _get_clinical_notes(self, metric_type: str, stats: Dict[str, Any]) -> Optional[str]:
        """Get clinical notes for specific metric types."""
        if metric_type == 'blood_pressure':
            sys_mean = stats.get('systolic_mean', 0)
            dia_mean = stats.get('diastolic_mean', 0)
            
            notes = []
            if sys_mean >= 140 or dia_mean >= 90:
                notes.append("Average readings suggest hypertension (≥140/90 mmHg).")
            elif sys_mean >= 130 or dia_mean >= 80:
                notes.append("Average readings indicate elevated blood pressure (130-139/80-89 mmHg).")
            else:
                notes.append("Average readings are within normal range (<130/80 mmHg).")
            
            notes.append("These are automated calculations based on patient-reported data. " \
                        "Professional medical evaluation is recommended for clinical decisions.")
            
            return " ".join(notes)
        
        elif metric_type == 'blood_sugar':
            mean_value = stats.get('mean', 0)
            
            if mean_value > 180:
                return "Average glucose levels are elevated. Consider reviewing with healthcare provider."
            elif mean_value < 70:
                return "Average glucose levels are low. Monitor for hypoglycemic episodes."
            else:
                return "Average glucose levels appear within typical ranges for self-monitoring."
        
        return None

    def _build_conclusions(self, health_data: List[HealthData], metric_types: List[str]) -> List:
        """Build conclusions and recommendations section."""
        elements = []
        
        elements.append(Spacer(1, 20))
        elements.append(Paragraph("Summary and Recommendations", self.styles['MedicalSubHeader']))
        
        conclusions_text = f"""
        This report summarizes {len(health_data)} health measurements across {len(metric_types)} metrics. 
        
        Key Observations:
        • Data collection shows consistent patient engagement in health monitoring
        • Trends and patterns are identified through statistical analysis
        • Clinical reference ranges are provided where applicable
        
        Recommendations:
        • Continue regular monitoring for trend identification
        • Share this report with healthcare providers during appointments
        • Consider professional medical evaluation for any concerning patterns
        • Maintain consistent measurement timing and conditions for best data quality
        
        Important Notes:
        • All data is patient-reported and may require clinical validation
        • Trends should be interpreted in context of overall health status
        • This report is for informational purposes and does not constitute medical advice
        """
        
        elements.append(Paragraph(conclusions_text, self.styles['Normal']))
        
        return elements

    def _build_footer(self) -> List:
        """Build report footer."""
        elements = []
        
        elements.append(Spacer(1, 30))
        
        footer_text = f"""
        <para alignment="center">
        Report Generated: {datetime.now().strftime("%Y-%m-%d %H:%M:%S")} | 
        MBHealth Data Tracking System | 
        For Medical Professional Use
        </para>
        """
        
        elements.append(Paragraph(footer_text, self.styles['Normal']))
        
        return elements


# Service instance
pdf_report_service = PDFReportService()