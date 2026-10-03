# Resource calendar reasons (v1196)

The Reason field on Add / Edit Calendar Entry is a multi-value list. Each reason is added on its own, then saved as one value with a line break between reasons.

The field appears when Availability Type is Unavailable or Partial. The calendar day cell shows the reasons separated by commas. The entry list and Audit details show each reason on its own line.

Run `SQL/v1196_resource_calendar_reason_text.sql` so a longer list is not rejected by the previous 255-character limit. Existing single-line reasons stay as one item.
