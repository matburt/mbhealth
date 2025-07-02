"""
Unit tests for health data functionality.
"""
from datetime import datetime

from app.models.health_data import HealthData
from app.utils.units import UnitConverter, convert_health_data_value


class TestHealthDataModel:
    """Test HealthData model functionality."""

    def test_health_data_creation(self, test_db_session, test_user):
        """Test creating health data."""
        health_data = HealthData(
            user_id=test_user.id,
            metric_type="blood_pressure",
            value=120.0,
            unit="mmHg",
            recorded_at=datetime.utcnow(),
            notes="Test reading"
        )

        test_db_session.add(health_data)
        test_db_session.commit()
        test_db_session.refresh(health_data)

        assert health_data.id is not None
        assert health_data.user_id == test_user.id
        assert health_data.metric_type == "blood_pressure"
        assert health_data.value == 120.0
        assert health_data.unit == "mmHg"

    def test_health_data_user_relationship(self, test_db_session, test_user):
        """Test health data relationship with user."""
        health_data = HealthData(
            user_id=test_user.id,
            metric_type="weight",
            value=70.0,
            unit="kg",
            recorded_at=datetime.utcnow()
        )

        test_db_session.add(health_data)
        test_db_session.commit()
        test_db_session.refresh(health_data)

        # Test relationship
        assert health_data.user == test_user
        assert health_data in test_user.health_data


class TestUnitConversion:
    """Test unit conversion functionality."""

    def test_weight_conversion_kg_to_lbs(self):
        """Test weight conversion from kg to lbs."""
        kg_value = 70.0
        lbs_value = convert_health_data_value(kg_value, "weight", "kg", "lbs")

        expected = kg_value * 2.20462
        assert abs(lbs_value - expected) < 0.01  # Allow small floating point differences

    def test_weight_conversion_lbs_to_kg(self):
        """Test weight conversion from lbs to kg."""
        lbs_value = 154.0
        kg_value = convert_health_data_value(lbs_value, "weight", "lbs", "kg")

        expected = lbs_value / 2.20462
        assert abs(kg_value - expected) < 0.01

    def test_temperature_conversion_c_to_f(self):
        """Test temperature conversion from Celsius to Fahrenheit."""
        celsius = 37.0
        fahrenheit = convert_health_data_value(celsius, "temperature", "c", "f")

        expected = (celsius * 9/5) + 32
        assert abs(fahrenheit - expected) < 0.01

    def test_temperature_conversion_f_to_c(self):
        """Test temperature conversion from Fahrenheit to Celsius."""
        fahrenheit = 98.6
        celsius = convert_health_data_value(fahrenheit, "temperature", "f", "c")

        expected = (fahrenheit - 32) * 5/9
        assert abs(celsius - expected) < 0.01

    def test_no_conversion_same_units(self):
        """Test that no conversion occurs when units are the same."""
        value = 120.0
        result = convert_health_data_value(value, "blood_pressure", "mmHg", "mmHg")
        assert result == value


class TestUnitConverter:
    """Test UnitConverter class."""

    def test_unit_converter_defaults(self):
        """Test UnitConverter with default preferences."""
        converter = UnitConverter()

        assert converter.user_weight_unit == "lbs"
        assert converter.user_temperature_unit == "f"
        assert converter.user_height_unit == "ft"

    def test_unit_converter_custom_preferences(self):
        """Test UnitConverter with custom preferences."""
        converter = UnitConverter(
            user_weight_unit="kg",
            user_temperature_unit="c",
            user_height_unit="cm"
        )

        assert converter.user_weight_unit == "kg"
        assert converter.user_temperature_unit == "c"
        assert converter.user_height_unit == "cm"

    def test_convert_to_user_units(self):
        """Test converting to user's preferred units."""
        converter = UnitConverter(user_weight_unit="lbs")

        # Convert 70kg to user's preferred lbs
        value, unit = converter.convert_to_user_units(70.0, "weight", "kg")

        expected_value = 70.0 * 2.20462
        assert abs(value - expected_value) < 0.01
        assert unit == "lbs"

    def test_get_user_unit_for_metric(self):
        """Test getting user's preferred unit for different metrics."""
        converter = UnitConverter(
            user_weight_unit="kg",
            user_temperature_unit="c",
            user_height_unit="cm"
        )

        assert converter.get_user_unit_for_metric("weight") == "kg"
        assert converter.get_user_unit_for_metric("temperature") == "c"
        assert converter.get_user_unit_for_metric("height") == "cm"
