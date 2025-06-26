"""
Pydantic models for RAD Monitor data validation
Provides strict validation for data flowing through the processing pipeline
"""

from typing import Dict, List, Any, Optional, Literal
from datetime import datetime
from pydantic import BaseModel, Field, field_validator, model_validator, ConfigDict
import re


class ElasticBucket(BaseModel):
    """Model for Elasticsearch aggregation bucket"""
    key: str = Field(..., description="Event ID key")
    doc_count: int = Field(..., ge=0, description="Document count for this bucket")
    baseline: Optional[Dict[str, int]] = Field(None, description="Baseline period data")
    current: Optional[Dict[str, int]] = Field(None, description="Current period data")

    @field_validator('key')
    @classmethod
    def validate_event_id(cls, v: str) -> str:
        """Validate event ID format"""
        if not v:
            raise ValueError("Event ID cannot be empty")
        # Common patterns for event IDs
        if not (v.startswith('feed_') or
                v.startswith('pandc.') or
                'recommendations' in v or
                '.' in v):
            raise ValueError(f"Unexpected event ID format: {v}")
        return v


class ElasticAggregations(BaseModel):
    """Model for Elasticsearch aggregations structure"""
    events: Dict[str, Any] = Field(..., description="Events aggregation")

    @field_validator('events')
    @classmethod
    def validate_events_structure(cls, v: Dict[str, Any]) -> Dict[str, Any]:
        """Validate events aggregation has buckets"""
        if 'buckets' not in v:
            raise ValueError("Events aggregation must contain 'buckets'")
        if not isinstance(v['buckets'], list):
            raise ValueError("Buckets must be a list")
        return v


class ElasticResponse(BaseModel):
    """Model for raw Elasticsearch response validation"""
    model_config = ConfigDict(extra='allow')  # Allow extra fields like 'took', '_shards', etc.

    aggregations: Optional[ElasticAggregations] = Field(None, description="Aggregations section")
    error: Optional[Dict[str, Any]] = Field(None, description="Error information if query failed")
    hits: Optional[Dict[str, Any]] = Field(None, description="Hits section (optional)")

    @model_validator(mode='after')
    def validate_aggregations_or_error(self):
        """Ensure we have either aggregations or error, not both"""
        if self.error and self.aggregations:
            raise ValueError("Response cannot have both aggregations and error")
        return self


class ProcessingConfig(BaseModel):
    """Model for processing configuration parameters"""
    baselineStart: str = Field(..., description="Baseline period start date (ISO format)")
    baselineEnd: str = Field(..., description="Baseline period end date (ISO format)")
    currentTimeRange: str = Field(default='now-12h', description="Current time range")
    highVolumeThreshold: int = Field(default=1000, ge=0, description="High volume threshold")
    mediumVolumeThreshold: int = Field(default=100, ge=0, description="Medium volume threshold")
    criticalThreshold: int = Field(default=-80, le=0, description="Critical score threshold")
    warningThreshold: int = Field(default=-50, le=0, description="Warning score threshold")

    @field_validator('baselineStart', 'baselineEnd')
    @classmethod
    def validate_date_format(cls, v: str) -> str:
        """Validate ISO date format"""
        try:
            datetime.fromisoformat(v)
        except ValueError:
            raise ValueError(f"Invalid ISO date format: {v}")
        return v

    @field_validator('currentTimeRange')
    @classmethod
    def validate_time_range(cls, v: str) -> str:
        """Validate time range format"""
        valid_patterns = [
            r'^now-\d+[hd]$',  # now-12h, now-1d
            r'^-\d+[hd]-\d+[hd]$',  # -24h-8h
            r'^inspection_time$'  # special case
        ]
        if not any(re.match(pattern, v) for pattern in valid_patterns):
            raise ValueError(f"Invalid time range format: {v}")
        return v

    @model_validator(mode='after')
    def validate_thresholds(self):
        """Ensure critical threshold is less than warning threshold"""
        if self.criticalThreshold >= self.warningThreshold:
            raise ValueError("Critical threshold must be less than warning threshold")
        return self


class RADTypeConfig(BaseModel):
    """Model for RAD type configuration"""
    pattern: str = Field(..., description="Elasticsearch wildcard pattern for this RAD type")
    display_name: str = Field(..., description="Display name for UI")
    enabled: bool = Field(default=True, description="Whether this RAD type is enabled")
    color: str = Field(default="#4CAF50", description="Color for UI display (hex format)")
    description: Optional[str] = Field(None, description="Description of this RAD type")

    @field_validator('pattern')
    @classmethod
    def validate_pattern(cls, v: str) -> str:
        """Validate pattern format"""
        if not v:
            raise ValueError("Pattern cannot be empty")
        # Should contain wildcards or be a valid event pattern
        if not ('*' in v or '.' in v):
            raise ValueError(f"Pattern should contain wildcards or namespace separators: {v}")
        return v

    @field_validator('color')
    @classmethod
    def validate_color(cls, v: str) -> str:
        """Validate color is in hex format"""
        if not re.match(r'^#[0-9A-Fa-f]{6}$', v):
            raise ValueError(f"Color must be in hex format (#RRGGBB): {v}")
        return v


class TrafficEvent(BaseModel):
    """Model for individual traffic event with counts and scores"""
    event_id: str = Field(..., description="Event identifier")
    display_name: str = Field(..., description="Display name for UI")
    rad_type: Optional[str] = Field(None, description="RAD type identifier (e.g., 'venture_feed')")
    current: int = Field(..., ge=0, description="Current period count")
    baseline_12h: int = Field(..., ge=0, description="Baseline 12h count (legacy field)")
    baseline_period: int = Field(..., ge=0, description="Baseline period count")
    daily_avg: int = Field(..., ge=0, description="Daily average from baseline")
    baseline_count: int = Field(..., ge=0, description="Total baseline count")
    baseline_days: int = Field(..., ge=1, description="Number of baseline days")
    current_hours: int = Field(..., ge=1, le=168, description="Current period hours (max 1 week)")
    score: int = Field(..., ge=-100, le=100, description="Health score percentage")
    status: Literal["CRITICAL", "WARNING", "NORMAL", "INCREASED"] = Field(..., description="Event status")

    @field_validator('event_id')
    @classmethod
    def validate_event_id_format(cls, v: str) -> str:
        """Validate event ID has expected format"""
        if not v:
            raise ValueError("Event ID cannot be empty")
        # More flexible validation to support multiple RAD types
        if not ('.' in v or '_' in v):
            raise ValueError(f"Event ID should contain namespace separators or underscores: {v}")
        return v

    @model_validator(mode='after')
    def validate_score_status_consistency(self):
        """Validate score is consistent with status"""
        # Based on _determine_status logic: critical <= -80, warning <= -50, increased > 0, normal otherwise
        if self.status == "CRITICAL" and self.score > -80:
            raise ValueError(f"CRITICAL status requires score <= -80, got {self.score}")
        elif self.status == "WARNING" and (self.score > -50 or self.score <= -80):
            raise ValueError(f"WARNING status requires -80 < score <= -50, got {self.score}")
        elif self.status == "INCREASED" and self.score <= 0:
            raise ValueError(f"INCREASED status requires score > 0, got {self.score}")
        elif self.status == "NORMAL" and (self.score > 0 or self.score <= -50):
            raise ValueError(f"NORMAL status requires -50 < score <= 0, got {self.score}")
        return self


class DashboardStats(BaseModel):
    """Model for dashboard summary statistics"""
    critical: int = Field(..., ge=0, description="Number of critical events")
    warning: int = Field(..., ge=0, description="Number of warning events")
    normal: int = Field(..., ge=0, description="Number of normal events")
    increased: int = Field(..., ge=0, description="Number of increased events")
    total: int = Field(..., ge=0, description="Total number of events")

    @model_validator(mode='after')
    def validate_total(self):
        """Validate total equals sum of all statuses"""
        expected_total = self.critical + self.warning + self.normal + self.increased
        if self.total != expected_total:
            raise ValueError(f"Total ({self.total}) must equal sum of all statuses ({expected_total})")
        return self


class DashboardData(BaseModel):
    """Model for final dashboard output data"""
    events: List[TrafficEvent] = Field(..., description="List of processed traffic events")
    stats: DashboardStats = Field(..., description="Summary statistics")
    generated_at: datetime = Field(default_factory=datetime.utcnow, description="Generation timestamp")
    config: ProcessingConfig = Field(..., description="Configuration used for processing")

    @field_validator('events')
    @classmethod
    def validate_events_sorted(cls, v: List[TrafficEvent]) -> List[TrafficEvent]:
        """Validate events are sorted by score (worst first)"""
        if len(v) > 1:
            scores = [event.score for event in v]
            if scores != sorted(scores):
                raise ValueError("Events must be sorted by score in ascending order (worst first)")
        return v

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for backward compatibility"""
        return {
            'events': [event.model_dump() for event in self.events],
            'stats': self.stats.model_dump(),
            'generated_at': self.generated_at.isoformat(),
            'config': self.config.model_dump()
        }


# Additional validation models for intermediate processing stages

class ProcessedEvent(BaseModel):
    """Model for event after initial processing but before scoring"""
    event_id: str = Field(..., description="Event identifier")
    display_name: str = Field(..., description="Display name for UI")
    current: int = Field(..., ge=0, description="Current period count")
    baseline_12h: int = Field(..., ge=0, description="Baseline 12h count")
    baseline_period: int = Field(..., ge=0, description="Baseline period count")
    daily_avg: int = Field(..., ge=0, description="Daily average from baseline")
    baseline_count: int = Field(..., ge=0, description="Total baseline count")
    baseline_days: int = Field(..., ge=1, description="Number of baseline days")
    current_hours: int = Field(..., ge=1, le=168, description="Current period hours")
