#!/usr/bin/env python3
"""
Seed Workflow Templates

Creates predefined workflow templates for common analysis patterns.
"""


from app.core.database import SessionLocal
from app.models.analysis_workflow import WorkflowTemplate


def create_workflow_templates():
    """Create predefined workflow templates"""
    print("Creating workflow templates...")

    db = SessionLocal()
    try:
        templates = [
            {
                "name": "Anomaly Detection Follow-up",
                "description": "When anomalies are detected, automatically run detailed analysis and recommendations",
                "category": "anomaly_detection",
                "trigger_analysis_type": "anomalies",
                "trigger_conditions": [
                    {
                        "type": "content_contains",
                        "field": "response_content",
                        "value": "anomaly",
                        "operator": "contains"
                    },
                    {
                        "type": "analysis_status",
                        "value": "completed",
                        "operator": "equals"
                    }
                ],
                "workflow_steps": [
                    {
                        "name": "Detailed Analysis",
                        "analysis_type": "insights",
                        "delay_minutes": 0,
                        "additional_context": "Provide detailed analysis of the anomalies detected in the previous analysis. Focus on potential causes and severity.",
                        "conditions": []
                    },
                    {
                        "name": "Health Recommendations",
                        "analysis_type": "recommendations",
                        "delay_minutes": 2,
                        "additional_context": "Based on the anomalies and detailed analysis, provide specific health recommendations and action items.",
                        "conditions": [
                            {"type": "previous_step_status", "value": "completed"}
                        ]
                    }
                ]
            },
            {
                "name": "Comprehensive Health Assessment",
                "description": "After trend analysis, automatically generate insights and recommendations",
                "category": "health_monitoring",
                "trigger_analysis_type": "trends",
                "trigger_conditions": [
                    {
                        "type": "analysis_status",
                        "value": "completed",
                        "operator": "equals"
                    }
                ],
                "workflow_steps": [
                    {
                        "name": "Health Insights",
                        "analysis_type": "insights",
                        "delay_minutes": 1,
                        "additional_context": "Analyze the trends identified and provide insights about health patterns and changes.",
                        "conditions": []
                    },
                    {
                        "name": "Personalized Recommendations",
                        "analysis_type": "recommendations",
                        "delay_minutes": 3,
                        "additional_context": "Based on the trends and insights, provide personalized recommendations for health improvement.",
                        "conditions": [
                            {"type": "previous_step_status", "value": "completed"}
                        ]
                    }
                ]
            },
            {
                "name": "Weekly Health Review",
                "description": "Comprehensive analysis chain for weekly health assessments",
                "category": "health_monitoring",
                "trigger_analysis_type": "insights",
                "trigger_conditions": [
                    {
                        "type": "analysis_status",
                        "value": "completed",
                        "operator": "equals"
                    }
                ],
                "workflow_steps": [
                    {
                        "name": "Trend Analysis",
                        "analysis_type": "trends",
                        "delay_minutes": 0,
                        "additional_context": "Analyze health trends over the past week. Look for patterns and changes.",
                        "conditions": []
                    },
                    {
                        "name": "Anomaly Check",
                        "analysis_type": "anomalies",
                        "delay_minutes": 5,
                        "additional_context": "Check for any anomalies or unusual patterns in the week's health data.",
                        "conditions": [
                            {"type": "previous_step_status", "value": "completed"}
                        ]
                    },
                    {
                        "name": "Weekly Recommendations",
                        "analysis_type": "recommendations",
                        "delay_minutes": 10,
                        "additional_context": "Provide comprehensive weekly recommendations based on trends and any anomalies found.",
                        "conditions": [
                            {"type": "previous_step_status", "value": "completed"}
                        ]
                    }
                ]
            },
            {
                "name": "Blood Pressure Alert Follow-up",
                "description": "When high blood pressure is detected, automatically provide detailed analysis",
                "category": "health_alerts",
                "trigger_analysis_type": "anomalies",
                "trigger_conditions": [
                    {
                        "type": "content_contains",
                        "field": "response_content",
                        "value": "blood pressure",
                        "operator": "contains"
                    },
                    {
                        "type": "content_contains",
                        "field": "response_content",
                        "value": "high",
                        "operator": "contains"
                    }
                ],
                "workflow_steps": [
                    {
                        "name": "Blood Pressure Insights",
                        "analysis_type": "insights",
                        "delay_minutes": 0,
                        "additional_context": "Focus specifically on blood pressure patterns. Analyze recent readings and potential contributing factors.",
                        "conditions": []
                    },
                    {
                        "name": "Lifestyle Recommendations",
                        "analysis_type": "recommendations",
                        "delay_minutes": 2,
                        "additional_context": "Provide specific lifestyle and health recommendations for managing blood pressure. Include dietary, exercise, and monitoring suggestions.",
                        "conditions": [
                            {"type": "previous_step_status", "value": "completed"}
                        ]
                    }
                ]
            },
            {
                "name": "New User Onboarding Analysis",
                "description": "Comprehensive analysis workflow for new users to understand their health data",
                "category": "onboarding",
                "trigger_analysis_type": "insights",
                "trigger_conditions": [
                    {
                        "type": "analysis_status",
                        "value": "completed",
                        "operator": "equals"
                    }
                ],
                "workflow_steps": [
                    {
                        "name": "Health Baseline Assessment",
                        "analysis_type": "trends",
                        "delay_minutes": 0,
                        "additional_context": "Establish baseline health metrics and identify any existing patterns in the user's health data.",
                        "conditions": []
                    },
                    {
                        "name": "Anomaly Screening",
                        "analysis_type": "anomalies",
                        "delay_minutes": 5,
                        "additional_context": "Screen for any concerning anomalies that might require attention or further monitoring.",
                        "conditions": []
                    },
                    {
                        "name": "Personalized Welcome Recommendations",
                        "analysis_type": "recommendations",
                        "delay_minutes": 10,
                        "additional_context": "Provide welcoming, personalized recommendations to help the user understand their health data and establish good monitoring habits.",
                        "conditions": []
                    }
                ]
            }
        ]

        created_count = 0
        for template_data in templates:
            # Check if template already exists
            existing = db.query(WorkflowTemplate).filter(
                WorkflowTemplate.name == template_data["name"]
            ).first()

            if not existing:
                template = WorkflowTemplate(
                    name=template_data["name"],
                    description=template_data["description"],
                    category=template_data["category"],
                    trigger_analysis_type=template_data["trigger_analysis_type"],
                    trigger_conditions=template_data["trigger_conditions"],
                    workflow_steps=template_data["workflow_steps"],
                    is_public=True
                )

                db.add(template)
                created_count += 1
                print(f"✅ Created template: {template_data['name']}")
            else:
                print(f"⏭️  Template already exists: {template_data['name']}")

        db.commit()
        print(f"\n🎉 Successfully created {created_count} workflow templates!")

    except Exception as e:
        print(f"❌ Error creating templates: {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    create_workflow_templates()
