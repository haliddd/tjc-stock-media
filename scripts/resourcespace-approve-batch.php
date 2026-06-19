<?php

include "/var/www/html/include/boot.php";
command_line_only();

$batch = $argv[1] ?? "MVP 2024 First Batch";
$reviewer = $argv[2] ?? "ResourceSpace admin";
$review_date = $argv[3] ?? date("Y-m-d");
$audit_path = $argv[4] ?? "/tmp/tjc-mvp-approval-audit.csv";
$min_ref = (int) ($argv[5] ?? 363);
$rights_status = $argv[6] ?? "Permission Confirmed";
$portal_confirmation = $argv[7] ?? "";

if ($portal_confirmation !== "portal-ready-confirmed") {
    fwrite(STDERR, "FAIL: batch approval now requires explicit portal-ready-confirmed confirmation after source, rights, people/minors, reviewer/date, usage scope, and derivative checks.\n");
    exit(1);
}

if (preg_match('/^(Approved Public|Approved Internal|Needs Review|Searchable Archive|Archive - Not Promoted|Do Not Use|Possible Minors)$/i', $rights_status)) {
    fwrite(STDERR, "FAIL: rights_status must describe rights, not publish workflow state.\n");
    exit(1);
}

function field_ref(string $shortname): int
{
    $ref = (int) ps_value(
        "SELECT ref value FROM resource_type_field WHERE name = ?",
        ["s", $shortname],
        0,
        "schema"
    );
    if ($ref <= 0) {
        fwrite(STDERR, "FAIL: metadata field not found: {$shortname}\n");
        exit(1);
    }
    return $ref;
}

$fields = [
    "import_batch" => field_ref("import_batch"),
    "rights_status" => field_ref("rights_status"),
    "publish_status" => field_ref("publish_status"),
    "workflow_state" => field_ref("workflow_state"),
    "public_safe" => field_ref("public_safe"),
    "usage_scope" => field_ref("usage_scope"),
    "reviewed_by" => field_ref("reviewed_by"),
    "reviewed_date" => field_ref("reviewed_date"),
    "approval_notes" => field_ref("approval_notes"),
];

$candidate_resources = ps_query(
    "SELECT ref, archive, file_extension, file_size
       FROM resource
      WHERE ref >= ?
      ORDER BY ref"
    ,
    ["i", $min_ref]
);

$resources = [];
foreach ($candidate_resources as $candidate) {
    $ref = (int) $candidate["ref"];
    if (get_data_by_field($ref, $fields["import_batch"]) === $batch) {
        $resources[] = $candidate;
    }
}

$handle = fopen($audit_path, "w");
fputcsv($handle, [
    "resource_id",
    "previous_archive_state",
    "new_archive_state",
    "file_extension",
    "file_size",
    "rights_status",
    "publish_status",
    "workflow_state",
    "public_safe",
    "usage_scope",
    "reviewed_by",
    "reviewed_date",
    "approval_notes",
]);

$approved = 0;
$notes = "Approved by {$reviewer} on {$review_date} for TJC MVP 2024 stock media prototype after explicit portal-ready confirmation. Approved Public is ResourceSpace status; portal reuse still depends on source, rights, people/minors, reviewer/date, usage scope, and derivative policy checks.";

foreach ($resources as $resource) {
    $ref = (int) $resource["ref"];
    $previous_archive = (int) $resource["archive"];

    update_field($ref, $fields["rights_status"], $rights_status);
    update_field($ref, $fields["publish_status"], "Approved Public");
    update_field($ref, $fields["workflow_state"], "Approved");
    update_field($ref, $fields["public_safe"], "Yes");
    update_field($ref, $fields["usage_scope"], "Public and Internal");
    update_field($ref, $fields["reviewed_by"], $reviewer);
    update_field($ref, $fields["reviewed_date"], $review_date);
    update_field($ref, $fields["approval_notes"], $notes);

    ps_query(
        "UPDATE resource SET archive = 0, modified = NOW() WHERE ref = ?",
        ["i", $ref]
    );

    fputcsv($handle, [
        $ref,
        $previous_archive,
        0,
        $resource["file_extension"],
        $resource["file_size"],
        $rights_status,
        "Approved Public",
        "Approved",
        "Yes",
        "Public and Internal",
        $reviewer,
        $review_date,
        $notes,
    ]);
    $approved++;
}

fclose($handle);

echo "Batch: {$batch}\n";
echo "Reviewer: {$reviewer}\n";
echo "Review date: {$review_date}\n";
echo "Rights status: {$rights_status}\n";
echo "Minimum resource ref: {$min_ref}\n";
echo "Review metadata updated: {$approved}\n";
echo "Audit: {$audit_path}\n";
