<?php

include_once "/var/www/html/include/boot.php";

command_line_only();

$collection_name = $argv[1] ?? "Local DAM Sample Assets";
$reviewer = $argv[2] ?? "Local Seed Reviewer";
$review_date = $argv[3] ?? gmdate("Y-m-d");

function seed_field_ref(string $shortname, string $title = ""): int
{
    $existing = (int) ps_value(
        "SELECT ref value FROM resource_type_field WHERE name = ?",
        ["s", $shortname],
        0,
        "schema"
    );
    if ($existing > 0) {
        return $existing;
    }
    $created = create_resource_type_field($title !== "" ? $title : ucwords(str_replace("_", " ", $shortname)), 0, FIELD_TYPE_TEXT_BOX_SINGLE_LINE, $shortname, true);
    return is_int($created) ? $created : 0;
}

function seed_update_field(int $resource, int $field, string $value): void
{
    if ($field > 0) {
        update_field($resource, $field, $value);
    }
}

$collection = (int) ps_value(
    "SELECT ref value FROM collection WHERE name = ? ORDER BY ref LIMIT 1",
    ["s", $collection_name],
    0
);
if ($collection <= 0) {
    fwrite(STDERR, "FAIL: sample collection not found: {$collection_name}\n");
    exit(1);
}

$fields = [
    "rights_status" => seed_field_ref("rights_status"),
    "publish_status" => seed_field_ref("publish_status"),
    "workflow_state" => seed_field_ref("workflow_state"),
    "public_safe" => seed_field_ref("public_safe"),
    "usage_scope" => seed_field_ref("usage_scope"),
    "people_visible" => seed_field_ref("people_visible"),
    "children_visible" => seed_field_ref("children_visible"),
    "minors_visible" => seed_field_ref("minors_visible"),
    "sensitive_context" => seed_field_ref("sensitive_context"),
    "consent_status" => seed_field_ref("consent_status"),
    "reviewed_by" => seed_field_ref("reviewed_by"),
    "reviewed_date" => seed_field_ref("reviewed_date"),
    "approval_notes" => seed_field_ref("approval_notes"),
    "usage_terms" => seed_field_ref("usage_terms"),
    "master_drive_path" => seed_field_ref("master_drive_path"),
    "master_custody_path_status" => seed_field_ref("master_custody_path_status", "Master Custody Path Status"),
    "rights_basis" => seed_field_ref("rights_basis", "Rights Basis"),
    "approved_channels" => seed_field_ref("approved_channels", "Approved Channels"),
    "reuse_tier" => seed_field_ref("reuse_tier", "Reuse Tier"),
    "visibility_tier" => seed_field_ref("visibility_tier", "Visibility Tier"),
    "sensitivity_class" => seed_field_ref("sensitivity_class", "Sensitivity Class"),
    "withdrawal_status" => seed_field_ref("withdrawal_status", "Withdrawal Status"),
    "domain_reviewer" => seed_field_ref("domain_reviewer", "Domain Reviewer"),
    "required_notice" => seed_field_ref("required_notice", "Required Notice"),
    "human_ai_decision" => seed_field_ref("human_ai_decision"),
    "visible_content_tags" => seed_field_ref("visible_content_tags"),
    "tjc_terms" => seed_field_ref("tjc_terms"),
    "hero_candidate" => seed_field_ref("hero_candidate"),
    "reusability_score" => seed_field_ref("reusability_score"),
];

$rows = ps_query(
    "SELECT r.ref, r.file_extension
       FROM resource r
       JOIN collection_resource cr ON cr.resource = r.ref
      WHERE cr.collection = ?
      ORDER BY r.ref",
    ["i", $collection]
);

$updated = 0;
foreach ($rows as $index => $row) {
    $ref = (int) $row["ref"];
    $is_public_sample = $index === 0;
    seed_update_field($ref, $fields["rights_status"], $is_public_sample ? "TJC-owned local sample" : "Unknown");
    seed_update_field($ref, $fields["publish_status"], $is_public_sample ? "Approved Public" : "Needs Review");
    seed_update_field($ref, $fields["workflow_state"], $is_public_sample ? "Approved" : "Intake");
    seed_update_field($ref, $fields["public_safe"], $is_public_sample ? "Yes" : "Unknown");
    seed_update_field($ref, $fields["usage_scope"], $is_public_sample ? "Public and Internal" : "Do Not Publish");
    seed_update_field($ref, $fields["people_visible"], $is_public_sample ? "No" : "Unknown");
    seed_update_field($ref, $fields["children_visible"], "Unknown");
    seed_update_field($ref, $fields["minors_visible"], $is_public_sample ? "No" : "Unknown");
    seed_update_field($ref, $fields["sensitive_context"], $is_public_sample ? "None" : "Unknown");
    seed_update_field($ref, $fields["consent_status"], $is_public_sample ? "Not required - generated sample" : "Unknown");
    seed_update_field($ref, $fields["reviewed_by"], $is_public_sample ? $reviewer : "");
    seed_update_field($ref, $fields["reviewed_date"], $is_public_sample ? $review_date : "");
    seed_update_field(
        $ref,
        $fields["approval_notes"],
        $is_public_sample
            ? "Generated local sample approved for portal smoke testing only. Source/original remains governed and no production claim is implied."
            : "Default import state. Human rights review required before use."
    );
    seed_update_field($ref, $fields["master_drive_path"], $is_public_sample ? "/Google Shared Drive/TJC Stock Media/Local Sample Originals/01-sabbath-worship-sample.jpg" : "");
    seed_update_field($ref, $fields["master_custody_path_status"], $is_public_sample ? "verified" : "planned");
    seed_update_field($ref, $fields["usage_terms"], $is_public_sample ? "website; social; print; projection" : "");
    seed_update_field($ref, $fields["rights_basis"], $is_public_sample ? "TJC-owned" : "unknown");
    seed_update_field($ref, $fields["approved_channels"], $is_public_sample ? "website; social; print; projection" : "");
    seed_update_field($ref, $fields["reuse_tier"], $is_public_sample ? "stock-safe" : "context-safe");
    seed_update_field($ref, $fields["visibility_tier"], $is_public_sample ? "public" : "reviewer/admin");
    seed_update_field($ref, $fields["sensitivity_class"], $is_public_sample ? "public-safe" : "member-sensitive");
    seed_update_field($ref, $fields["withdrawal_status"], "active");
    seed_update_field($ref, $fields["domain_reviewer"], $is_public_sample ? "DAM-reviewer" : "");
    seed_update_field($ref, $fields["required_notice"], $is_public_sample ? "Generated local beta sample. Do not treat as production approval." : "");
    seed_update_field($ref, $fields["human_ai_decision"], $is_public_sample ? "No AI suggestion used" : "");
    seed_update_field($ref, $fields["visible_content_tags"], $is_public_sample ? "sample; worship; local-test" : "sample; needs-review");
    seed_update_field($ref, $fields["tjc_terms"], $is_public_sample ? "worship; sabbath; local-test" : "review-needed; local-test");
    seed_update_field($ref, $fields["hero_candidate"], $is_public_sample ? "Yes" : "No");
    seed_update_field($ref, $fields["reusability_score"], $is_public_sample ? "80" : "20");
    ps_query(
        "UPDATE resource SET archive = -1, modified = NOW() WHERE ref = ?",
        ["i", $ref]
    );
    $updated++;
}

echo "Sample collection: {$collection_name} ({$collection})\n";
echo "Sample state records updated: {$updated}\n";
echo "Public sample reviewer: {$reviewer}\n";
echo "Public sample review date: {$review_date}\n";
