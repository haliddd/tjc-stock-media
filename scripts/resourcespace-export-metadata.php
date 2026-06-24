<?php

include "/var/www/html/include/boot.php";
command_line_only();

$out = $argv[1] ?? "/tmp/tjc-mvp-metadata-export.csv";
$min_ref = max(1, (int) ($argv[2] ?? 363));
$fields = [
    "original_filename" => 51,
    "title" => 8,
    "source" => 54,
    "notes" => 25,
    "canonical_asset_id" => "canonical_asset_id",
    "checksum_sha256" => "checksum_sha256",
    "source_platform" => "source_platform",
    "source_system" => "source_system",
    "source_account" => "source_account",
    "source_album" => "source_album",
    "source_album_path" => "source_album_path",
    "source_album_memberships" => "source_album_memberships",
    "source_path" => "source_path",
    "source_paths_all" => "source_paths_all",
    "original_extension" => "original_extension",
    "original_file_size_bytes" => "original_file_size_bytes",
    "import_batch" => "import_batch",
    "import_manifest_row_id" => "import_manifest_row_id",
    "resourcespace_ref" => "resourcespace_ref",
    "master_drive_path" => "master_drive_path",
    "master_drive_paths_all" => "master_drive_paths_all",
    "master_custody_path_status" => "master_custody_path_status",
    "media_type" => "media_type",
    "event_or_topic" => "event_or_topic",
    "ministry_area" => "ministry_area",
    "season" => "season",
    "location_context" => "location_context",
    "emotional_tone" => "emotional_tone",
    "hero_candidate" => "hero_candidate",
    "reusability_score" => "reusability_score",
    "quality_status" => "quality_status",
    "technical_quality" => "technical_quality",
    "rights_status" => "rights_status",
    "publish_status" => "publish_status",
    "workflow_state" => "workflow_state",
    "public_safe" => "public_safe",
    "usage_scope" => "usage_scope",
    "visible_content_tags" => "visible_content_tags",
    "tjc_terms" => "tjc_terms",
    "brand_terms" => "brand_terms",
    "usage_terms" => "usage_terms",
    "rights_basis" => "rights_basis",
    "approved_channels" => "approved_channels",
    "reuse_tier" => "reuse_tier",
    "visibility_tier" => "visibility_tier",
    "sensitivity_class" => "sensitivity_class",
    "withdrawal_status" => "withdrawal_status",
    "domain_reviewer" => "domain_reviewer",
    "required_notice" => "required_notice",
    "human_title_final" => "human_title_final",
    "human_tags_final" => "human_tags_final",
    "people_visible" => "people_visible",
    "children_visible" => "children_visible",
    "minors_visible" => "minors_visible",
    "sensitive_context" => "sensitive_context",
    "consent_status" => "consent_status",
    "reviewed_by" => "reviewed_by",
    "reviewed_date" => "reviewed_date",
    "approval_notes" => "approval_notes",
    "derivative_status" => "derivative_status",
    "duplicate_group" => "duplicate_group",
    "duplicate_role" => "duplicate_role",
    "captured_date" => "captured_date",
    "captured_date_source" => "captured_date_source",
    "camera_make" => "camera_make",
    "camera_model" => "camera_model",
    "image_dimensions" => "image_dimensions",
    "file_format" => "file_format",
    "original_format" => "original_format",
    "preview_format" => "preview_format",
    "conversion_needed" => "conversion_needed",
    "conversion_status" => "conversion_status",
    "derivative_path" => "derivative_path",
    "original_preserved" => "original_preserved",
    "ai_provider" => "ai_provider",
    "ai_model" => "ai_model",
    "ai_prompt_version" => "ai_prompt_version",
    "ai_run_id" => "ai_run_id",
    "ai_cost_estimate" => "ai_cost_estimate",
    "ai_title_suggestion" => "ai_title_suggestion",
    "ai_visible_tag_suggestions" => "ai_visible_tag_suggestions",
    "ai_tjc_term_suggestions" => "ai_tjc_term_suggestions",
    "ai_quality_suggestion" => "ai_quality_suggestion",
    "ai_people_or_minor_flag" => "ai_people_or_minor_flag",
    "human_ai_decision" => "human_ai_decision",
];

foreach ($fields as $name => $ref_or_shortname) {
    if (!is_int($ref_or_shortname)) {
        $fields[$name] = (int) ps_value(
            "SELECT ref value FROM resource_type_field WHERE name = ?",
            ["s", $ref_or_shortname],
            0,
            "schema"
        );
    }
}

$handle = fopen($out, "w");
$header = array_merge([
    "resource_id",
    "archive_state",
    "resource_type",
    "file_extension",
    "file_size",
    "alternative_file_count",
], array_keys($fields));
fputcsv($handle, $header);

$rows = ps_query(
    "SELECT ref, archive, resource_type, file_extension, file_size FROM resource WHERE ref >= ? AND archive IN (-1,0) ORDER BY ref",
    ["i", $min_ref]
);
foreach ($rows as $row) {
    $ref = (int) $row["ref"];
    $alternative_count = (int) ps_value(
        "SELECT COUNT(*) value FROM resource_alt_files WHERE resource = ?",
        ["i", $ref],
        0
    );
    $line = [
        $ref,
        $row["archive"],
        $row["resource_type"],
        $row["file_extension"],
        $row["file_size"],
        $alternative_count,
    ];
    foreach ($fields as $field_ref) {
        $line[] = $field_ref > 0 ? get_data_by_field($ref, $field_ref) : "";
    }
    fputcsv($handle, $line);
}

fclose($handle);
echo "Metadata export written: {$out}\n";
