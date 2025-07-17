"""
HTML Generator for RAD Monitor Dashboard
Generates the final HTML output from processed data
"""

from typing import Dict, List, Any
from datetime import datetime
import os


class HTMLGenerator:
    """Generates HTML dashboard from processed data and template"""

    def __init__(self, template_path: str):
        self.template_path = template_path

    def generate(self, events: List[Dict[str, Any]], stats: Dict[str, int]) -> str:
        """
        Generate complete HTML dashboard

        Args:
            events: List of processed and scored events
            stats: Summary statistics

        Returns:
            Complete HTML string
        """
        # Load template
        template = self._load_template()

        # Generate table rows
        table_rows = self._generate_table_rows(events)

        # Generate timestamp
        timestamp = datetime.utcnow().strftime('%a %b %d %H:%M:%S UTC %Y')

        # Replace placeholders
        html = template.replace('{{CRITICAL_COUNT}}', str(stats['critical']))
        html = html.replace('{{WARNING_COUNT}}', str(stats['warning']))
        html = html.replace('{{NORMAL_COUNT}}', str(stats['normal']))
        html = html.replace('{{INCREASED_COUNT}}', str(stats['increased']))
        html = html.replace('{{TABLE_ROWS}}', table_rows)
        html = html.replace('{{TIMESTAMP}}', timestamp)

        return html

    def _load_template(self) -> str:
        """Load HTML template from file"""
        if not os.path.exists(self.template_path):
            raise FileNotFoundError(f"Template not found: {self.template_path}")

        with open(self.template_path, 'r', encoding='utf-8') as f:
            return f.read()

    def _generate_table_rows(self, events: List[Dict[str, Any]]) -> str:
        """Generate HTML table rows for events"""
        rows = []

        for item in events:
            score_class = 'negative' if item['score'] < 0 else 'positive'
            score_text = f"{item['score']:+d}%"

            diff = item['current'] - item['baseline_period']
            if diff < -50:
                impact = f'Lost ~{abs(diff):,} impressions'
                impact_class = 'loss'
            elif diff > 50:
                impact = f'Gained ~{diff:,} impressions'
                impact_class = 'gain'
            else:
                impact = 'Normal variance'
                impact_class = ''

            # Build Kibana URL
            kibana_url = self._build_kibana_url(item['event_id'])

            row = f"""
                        <tr>
                            <td><a href="{kibana_url}" target="_blank" class="event-link">
                                <span class="event-name">{item['event_id']}</span>
                            </a></td>
                            <td><span class="badge {item['status'].lower()}">{item['status']}</span></td>
                            <td class="number"><span class="score {score_class}">{score_text}</span></td>
                            <td class="number">{item['current']:,}</td>
                            <td class="number">{item['baseline_period']:,}</td>
                            <td class="number">{item['daily_avg']:,}</td>
                            <td><span class="impact {impact_class}">{impact}</span></td>
                        </tr>"""

            rows.append(row)

        return '\n'.join(rows)

    def _build_kibana_url(self, event_id: str) -> str:
        """Build Kibana discover URL for event"""
        base_url = "https://usieventho-prod-usw2.kb.us-west-2.aws.found.io:9243"
        discover_path = "/app/discover#/"

        # URL parameters for filtering by event ID
        params = (
            "?_g=(filters:!(),refreshInterval:(pause:!t,value:0),"
            "time:(from:'2025-05-28T16:50:47.243Z',to:now))"
            "&_a=(columns:!(),filters:!(('$state':(store:appState),"
            f"meta:(alias:!n,disabled:!f,key:detail.event.data.traffic.eid.keyword,"
            f"negate:!f,params:(query:'{event_id}'),type:phrase),"
            f"query:(match_phrase:(detail.event.data.traffic.eid.keyword:'{event_id}')))),"
            "grid:(columns:(detail.event.data.traffic.eid.keyword:(width:400))),"
            "hideChart:!f,index:'traffic-*',interval:auto,query:(language:kuery,query:''),sort:!())"
        )

        return base_url + discover_path + params
