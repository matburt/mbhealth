from typing import Any


def convert_weight(value: float, from_unit: str, to_unit: str) -> float:
    if from_unit == to_unit:
        return value
    if from_unit == "kg" and to_unit == "lbs":
        return value * 2.20462
    elif from_unit == "lbs" and to_unit == "kg":
        return value / 2.20462
    else:
        raise ValueError(f"Unsupported weight conversion: {from_unit} to {to_unit}")


def convert_temperature(value: float, from_unit: str, to_unit: str) -> float:
    if from_unit == to_unit:
        return value
    if from_unit == "c" and to_unit == "f":
        return (value * 9/5) + 32
    elif from_unit == "f" and to_unit == "c":
        return (value - 32) * 5/9
    else:
        raise ValueError(f"Unsupported temperature conversion: {from_unit} to {to_unit}")


def convert_height(value: float, from_unit: str, to_unit: str) -> float:
    if from_unit == to_unit:
        return value
    if from_unit == "cm" and to_unit == "ft":
        return value / 30.48
    elif from_unit == "ft" and to_unit == "cm":
        return value * 30.48
    else:
        raise ValueError(f"Unsupported height conversion: {from_unit} to {to_unit}")


def format_height_imperial(feet_decimal: float) -> str:
    feet = int(feet_decimal)
    inches = round((feet_decimal - feet) * 12)
    return f"{feet}' {inches}\""


def get_unit_label(metric_type: str, unit: str) -> str:
    labels = {
        "weight": {"kg": "kg", "lbs": "lbs"},
        "temperature": {"c": "°C", "f": "°F"},
        "height": {"cm": "cm", "ft": "ft"}
    }
    return labels.get(metric_type, {}).get(unit, unit)


def convert_health_data_value(value: float, metric_type: str, from_unit: str, to_unit: str) -> float:
    if metric_type == "weight":
        return convert_weight(value, from_unit, to_unit)
    elif metric_type == "temperature":
        return convert_temperature(value, from_unit, to_unit)
    elif metric_type == "height":
        return convert_height(value, from_unit, to_unit)
    else:
        return value


def get_default_unit_for_metric(metric_type: str, system: str = "imperial") -> str:
    defaults = {
        "imperial": {
            "weight": "lbs", "temperature": "f", "height": "ft",
            "blood_pressure": "mmHg", "blood_sugar": "mg/dL", "heart_rate": "bpm"
        },
        "metric": {
            "weight": "kg", "temperature": "c", "height": "cm",
            "blood_pressure": "mmHg", "blood_sugar": "mmol/L", "heart_rate": "bpm"
        }
    }
    return defaults.get(system, {}).get(metric_type, "")


def format_value_with_unit(value: float, metric_type: str, unit: str, precision: int = 1) -> str:
    if metric_type == "height" and unit == "ft":
        return format_height_imperial(value)
    else:
        unit_label = get_unit_label(metric_type, unit)
        return f"{value:.{precision}f} {unit_label}"


def should_convert_metric(metric_type: str) -> bool:
    convertible_metrics = {"weight", "temperature", "height"}
    return metric_type in convertible_metrics


class UnitConverter:
    def __init__(self, user_weight_unit: str = "lbs", user_temperature_unit: str = "f", user_height_unit: str = "ft"):
        self.user_weight_unit = user_weight_unit
        self.user_temperature_unit = user_temperature_unit
        self.user_height_unit = user_height_unit

    def convert_to_user_units(self, value: float, metric_type: str, stored_unit: str) -> tuple[float, str]:
        user_unit = self.get_user_unit_for_metric(metric_type)
        if should_convert_metric(metric_type):
            converted_value = convert_health_data_value(value, metric_type, stored_unit, user_unit)
            return converted_value, user_unit
        else:
            return value, stored_unit

    def get_user_unit_for_metric(self, metric_type: str) -> str:
        if metric_type == "weight":
            return self.user_weight_unit
        elif metric_type == "temperature":
            return self.user_temperature_unit
        elif metric_type == "height":
            return self.user_height_unit
        else:
            return get_default_unit_for_metric(metric_type, "imperial")


def create_unit_converter(user: Any) -> UnitConverter:
    weight_unit = getattr(user, 'weight_unit', 'lbs')
    temperature_unit = getattr(user, 'temperature_unit', 'f')
    height_unit = getattr(user, 'height_unit', 'ft')
    return UnitConverter(
        user_weight_unit=weight_unit,
        user_temperature_unit=temperature_unit,
        user_height_unit=height_unit
    )
