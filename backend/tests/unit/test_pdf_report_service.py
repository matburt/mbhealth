"""
Unit tests for PDF report service, focusing on unit conversion functionality
"""
from datetime import datetime, timedelta
from unittest.mock import Mock, patch

import pytest

from app.models.health_data import HealthData
from app.models.user import User
from app.services.pdf_report_service import PDFReportService
from app.utils.units import UnitConverter


class TestPDFReportService:
    """Test PDF report service functionality"""

    @pytest.fixture
    def pdf_service(self):
        """PDF report service instance"""
        return PDFReportService()

    @pytest.fixture
    def mock_user_lbs(self):
        """Mock user with pounds preference"""
        user = Mock(spec=User)
        user.id = 1
        user.full_name = "Test User"
        user.email = "test@example.com"
        user.weight_unit = "lbs"
        user.temperature_unit = "f"
        user.height_unit = "ft"
        return user

    @pytest.fixture
    def mock_user_kg(self):
        """Mock user with kg preference"""
        user = Mock(spec=User)
        user.id = 2
        user.full_name = "Test User 2"
        user.email = "test2@example.com"
        user.weight_unit = "kg"
        user.temperature_unit = "c"
        user.height_unit = "cm"
        return user

    @pytest.fixture
    def weight_data_kg(self):
        """Sample weight data stored in kg"""
        base_time = datetime.utcnow() - timedelta(days=3)
        data = []
        for i in range(3):
            health_data = Mock(spec=HealthData)
            health_data.metric_type = "weight"
            health_data.value = 70.0 + i  # 70, 71, 72 kg
            health_data.unit = "kg"
            health_data.recorded_at = base_time + timedelta(days=i)
            health_data.notes = f"Day {i+1}"
            data.append(health_data)
        return data

    def test_calculate_statistics_with_unit_conversion_kg_to_lbs(self, pdf_service, weight_data_kg, mock_user_lbs):
        """Test statistics calculation converts kg to lbs correctly"""
        from app.utils.units import create_unit_converter

        unit_converter = create_unit_converter(mock_user_lbs)

        stats = pdf_service._calculate_statistics(
            weight_data_kg, "weight", unit_converter
        )

        # 70 kg = ~154.3 lbs, 71 kg = ~156.5 lbs, 72 kg = ~158.7 lbs
        assert stats["unit"] == "lbs"
        assert abs(stats["mean"] - 156.5) < 0.1  # 71 kg converted to lbs
        assert abs(stats["min"] - 154.3) < 0.1   # 70 kg converted to lbs
        assert abs(stats["max"] - 158.7) < 0.1   # 72 kg converted to lbs

    def test_calculate_statistics_no_conversion_needed(self, pdf_service, weight_data_kg, mock_user_kg):
        """Test statistics calculation when no conversion needed"""
        from app.utils.units import create_unit_converter

        unit_converter = create_unit_converter(mock_user_kg)

        stats = pdf_service._calculate_statistics(
            weight_data_kg, "weight", unit_converter
        )

        # Should remain in kg
        assert stats["unit"] == "kg"
        assert stats["mean"] == 71.0  # No conversion
        assert stats["min"] == 70.0
        assert stats["max"] == 72.0

    def test_calculate_statistics_without_unit_converter(self, pdf_service, weight_data_kg):
        """Test statistics calculation without unit converter (fallback behavior)"""

        stats = pdf_service._calculate_statistics(
            weight_data_kg, "weight", None
        )

        # Should use original units from data
        assert stats["unit"] == "kg"
        assert stats["mean"] == 71.0
        assert stats["min"] == 70.0
        assert stats["max"] == 72.0

    def test_calculate_statistics_blood_pressure(self, pdf_service):
        """Test statistics calculation for blood pressure (no unit conversion)"""
        base_time = datetime.utcnow() - timedelta(days=2)
        bp_data = []

        for i in range(2):
            health_data = Mock(spec=HealthData)
            health_data.metric_type = "blood_pressure"
            health_data.systolic = 120 + i
            health_data.diastolic = 80 + i
            health_data.unit = "mmHg"
            health_data.recorded_at = base_time + timedelta(days=i)
            bp_data.append(health_data)

        stats = pdf_service._calculate_statistics(bp_data, "blood_pressure", None)

        assert stats["unit"] == "mmHg"
        assert stats["systolic_mean"] == 120.5
        assert stats["diastolic_mean"] == 80.5

    @patch('app.services.pdf_report_service.plt')
    def test_generate_metric_chart_with_unit_conversion(self, mock_plt, pdf_service, weight_data_kg, mock_user_lbs):
        """Test chart generation with unit conversion"""
        from app.utils.units import create_unit_converter

        # Mock matplotlib components
        mock_fig = Mock()
        mock_ax = Mock()
        mock_plt.subplots.return_value = (mock_fig, mock_ax)
        mock_plt.savefig.return_value = None
        mock_plt.close.return_value = None

        unit_converter = create_unit_converter(mock_user_lbs)

        # This should not raise an exception
        pdf_service._generate_metric_chart(
            "weight", weight_data_kg, None, unit_converter
        )

        # Verify the y-axis label includes converted units
        mock_ax.set_ylabel.assert_called_with("Weight (lbs)")

        # Verify plot was called with converted values
        mock_ax.plot.assert_called()
        plot_call_args = mock_ax.plot.call_args[0]

        # The values should be converted from kg to lbs
        converted_values = plot_call_args[1]  # Second argument is the values
        assert abs(converted_values[0] - 154.3) < 0.1  # 70 kg to lbs
        assert abs(converted_values[1] - 156.5) < 0.1  # 71 kg to lbs
        assert abs(converted_values[2] - 158.7) < 0.1  # 72 kg to lbs

    @patch('app.services.pdf_report_service.plt')
    def test_generate_metric_chart_without_conversion(self, mock_plt, pdf_service, weight_data_kg):
        """Test chart generation without unit conversion"""

        # Mock matplotlib components
        mock_fig = Mock()
        mock_ax = Mock()
        mock_plt.subplots.return_value = (mock_fig, mock_ax)
        mock_plt.savefig.return_value = None
        mock_plt.close.return_value = None

        pdf_service._generate_metric_chart(
            "weight", weight_data_kg, None, None
        )

        # Verify the y-axis label uses original units
        mock_ax.set_ylabel.assert_called_with("Weight (kg)")

    @pytest.mark.asyncio
    async def test_get_user_info_fallback_includes_unit_preferences(self, pdf_service):
        """Test that fallback user creation includes unit preferences"""

        user = await pdf_service._get_user_info(123, None)

        # Should have default unit preferences
        assert user.weight_unit == "lbs"
        assert user.temperature_unit == "f"
        assert user.height_unit == "ft"
        assert user.id == 123

    @pytest.mark.asyncio
    async def test_generate_health_report_with_unit_conversion_integration(self, pdf_service, weight_data_kg):
        """Integration test for complete report generation with unit conversion"""
        base_time = datetime.utcnow() - timedelta(days=3)

        # Mock the database session to return a user with lbs preference
        mock_session = Mock()
        mock_user = Mock(spec=User)
        mock_user.id = 1
        mock_user.full_name = "Test User"
        mock_user.email = "test@example.com"
        mock_user.weight_unit = "lbs"
        mock_user.temperature_unit = "f"
        mock_user.height_unit = "ft"

        mock_session.query.return_value.filter.return_value.first.return_value = mock_user

        # This should generate a PDF without errors
        pdf_bytes = await pdf_service.generate_health_report(
            user_id=1,
            health_data=weight_data_kg,
            date_range=(base_time, datetime.utcnow()),
            metric_types=["weight"],
            include_charts=True,
            include_summary=True,
            include_trends=True,
            db_session=mock_session
        )

        # Should return PDF bytes
        assert isinstance(pdf_bytes, bytes)
        assert len(pdf_bytes) > 0

        # Verify user was queried from database
        mock_session.query.assert_called()

    def test_unit_conversion_edge_cases(self, pdf_service):
        """Test edge cases in unit conversion"""

        # Test with empty data
        stats = pdf_service._calculate_statistics([], "weight", None)
        assert stats["unit"] == ""
        assert stats["count"] == 0

        # Test with single data point
        single_data = [Mock(spec=HealthData)]
        single_data[0].metric_type = "weight"
        single_data[0].value = 75.0
        single_data[0].unit = "kg"

        converter = UnitConverter(user_weight_unit="lbs")

        stats = pdf_service._calculate_statistics(single_data, "weight", converter)

        assert stats["unit"] == "lbs"
        assert abs(stats["mean"] - 165.3) < 0.1  # 75 kg to lbs

    def test_mixed_units_conversion(self, pdf_service, mock_user_lbs):
        """Test statistics calculation with mixed units (kg and lbs)"""
        from app.utils.units import create_unit_converter
        
        # Create mixed unit data
        mixed_data = []
        for i, (value, unit) in enumerate([(70.0, "kg"), (155.0, "lbs"), (71.0, "kg")]):
            health_data = Mock(spec=HealthData)
            health_data.metric_type = "weight"
            health_data.value = value
            health_data.unit = unit
            health_data.recorded_at = datetime.utcnow() - timedelta(days=i)
            mixed_data.append(health_data)
        
        unit_converter = create_unit_converter(mock_user_lbs)
        stats = pdf_service._calculate_statistics(mixed_data, "weight", unit_converter)
        
        # Expected: 70kg->154.3lbs, 155lbs->155lbs, 71kg->156.5lbs
        # Mean should be around (154.3 + 155 + 156.5)/3 = 155.3
        assert stats["unit"] == "lbs"
        assert abs(stats["mean"] - 155.3) < 0.2  # Allow small margin for floating point
        assert stats["std"] < 5  # Should be small variation, not huge
