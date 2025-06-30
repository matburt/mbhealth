"""
Unit Conversion Utilities

Provides conversion functions between metric and imperial units for health data.
"""

from typing import Any


def convert_weight(value: float, from_unit: str, to_unit: str) -> float:
    """Convert weight between kg and lbs"""
    if from_unit == to_unit:
        return value
    
    if from_unit == "kg" and to_unit == "lbs":
        return value * 2.20462  # kg to lbs
    elif from_unit == "lbs" and to_unit == "kg":
        return value / 2.20462  # lbs to kg
    else:
        raise ValueError(f"Unsupported weight conversion: {from_unit} to {to_unit}")


def convert_temperature(value: float, from_unit: str, to_unit: str) -> float:
    """Convert temperature between Celsius and Fahrenheit"""
    if from_unit == to_unit:
        return value
    
    if from_unit == "c" and to_unit == "f":
        return (value * 9/5) + 32  # Celsius to Fahrenheit
    elif from_unit == "f" and to_unit == "c":
        return (value - 32) * 5/9  # Fahrenheit to Celsius
    else:
        raise ValueError(f"Unsupported temperature conversion: {from_unit} to {to_unit}")


def convert_height(value: float, from_unit: str, to_unit: str) -> float:
    """Convert height between cm and ft (decimal feet)"""
    if from_unit == to_unit:
        return value
    
    if from_unit == "cm" and to_unit == "ft":
        return value / 30.48  # cm to feet
    elif from_unit == "ft" and to_unit == "cm":
        return value * 30.48  # feet to cm
    else:
        raise ValueError(f"Unsupported height conversion: {from_unit} to {to_unit}")


def format_height_imperial(feet_decimal: float) -> str:
    """Format decimal feet to feet and inches (e.g., 5.75 -> "5' 9\"")"""
    feet = int(feet_decimal)
    inches = round((feet_decimal - feet) * 12)
    return f"{feet}' {inches}\""


def parse_height_imperial(height_str: str) -> float:
    """Parse height string like "5' 9\"" to decimal feet"""
    try:
        # Remove quotes and split
        height_str = height_str.replace("'", "").replace("\"", "").replace("'", "").replace(""", "")
        parts = height_str.split()
        
        if len(parts) == 2:
            feet = int(parts[0])
            inches = int(parts[1])
            return feet + (inches / 12)
        elif len(parts) == 1:
            # Assume it's just feet
            return float(parts[0])
        else:
            raise ValueError("Invalid height format")
    except (ValueError, IndexError):
        raise ValueError(f"Cannot parse height: {height_str}. Expected format like '5 9' or '5' 9\"'")


def get_unit_label(metric_type: str, unit: str) -> str:
    """Get user-friendly unit label"""
    labels = {
        "weight": {
            "kg": "kg",
            "lbs": "lbs"
        },
        "temperature": {
            "c": "°C",
            "f": "°F"
        },
        "height": {
            "cm": "cm",
            "ft": "ft"
        }
    }
    
    return labels.get(metric_type, {}).get(unit, unit)


def convert_health_data_value(
    value: float,
    metric_type: str,
    from_unit: str,
    to_unit: str
) -> float:
    """Convert health data value based on metric type"""
    if metric_type == "weight":
        return convert_weight(value, from_unit, to_unit)
    elif metric_type == "temperature":
        return convert_temperature(value, from_unit, to_unit)
    elif metric_type == "height":
        return convert_height(value, from_unit, to_unit)
    else:
        # For other metrics, no conversion needed
        return value


def get_default_unit_for_metric(metric_type: str, system: str = "imperial") -> str:
    """Get default unit for a metric type in imperial or metric system"""
    defaults = {
        "imperial": {
            "weight": "lbs",
            "temperature": "f",
            "height": "ft",
            "blood_pressure": "mmHg",
            "blood_sugar": "mg/dL",
            "heart_rate": "bpm"
        },
        "metric": {
            "weight": "kg",
            "temperature": "c", 
            "height": "cm",
            "blood_pressure": "mmHg",
            "blood_sugar": "mmol/L",
            "heart_rate": "bpm"
        }
    }
    
    return defaults.get(system, {}).get(metric_type, "")


def format_value_with_unit(
    value: float,
    metric_type: str,
    unit: str,
    precision: int = 1
) -> str:
    """Format a value with its unit for display"""
    if metric_type == "height" and unit == "ft":
        # Special formatting for imperial height
        return format_height_imperial(value)
    else:
        unit_label = get_unit_label(metric_type, unit)
        return f"{value:.{precision}f} {unit_label}"


def should_convert_metric(metric_type: str) -> bool:
    """Check if a metric type supports unit conversion"""
    convertible_metrics = {"weight", "temperature", "height"}
    return metric_type in convertible_metrics


class UnitConverter:
    """Helper class for unit conversions with user preferences"""

    def __init__(self, user_weight_unit: str = "lbs", user_temperature_unit: str = "f", user_height_unit: str = "ft"):
        self.user_weight_unit = user_weight_unit
        self.user_temperature_unit = user_temperature_unit
        self.user_height_unit = user_height_unit

    def convert_to_user_units(self, value: float, metric_type: str, stored_unit: str) -> tuple[float, str]:
        """Convert a stored value to user's preferred units"""
        user_unit = self.get_user_unit_for_metric(metric_type)

        if should_convert_metric(metric_type):
            converted_value = convert_health_data_value(value, metric_type, stored_unit, user_unit)
            return converted_value, user_unit
        else:
            return value, stored_unit

    def convert_from_user_units(self, value: float, metric_type: str, target_unit: str) -> float:
        """Convert a value from user's units to target storage unit"""
        user_unit = self.get_user_unit_for_metric(metric_type)

        if should_convert_metric(metric_type):
            return convert_health_data_value(value, metric_type, user_unit, target_unit)
        else:
            return value

    def get_user_unit_for_metric(self, metric_type: str) -> str:
        """Get user's preferred unit for a metric type"""
        if metric_type == "weight":
            return self.user_weight_unit
        elif metric_type == "temperature":
            return self.user_temperature_unit
        elif metric_type == "height":
            return self.user_height_unit
        else:
            # For metrics without conversion, return default
            return get_default_unit_for_metric(metric_type, "imperial")

    def format_value(self, value: float, metric_type: str, precision: int = 1) -> str:
        """Format value with user's preferred units"""
        user_unit = self.get_user_unit_for_metric(metric_type)
        return format_value_with_unit(value, metric_type, user_unit, precision)