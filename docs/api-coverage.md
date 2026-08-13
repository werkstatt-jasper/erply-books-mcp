# API coverage matrix

Generated 2026-08-13 by diffing the official [Erply Books OpenAPI spec](https://www.erplybooks.com/api-documentation) (301 paths / 356 operations) against the tools in `src/tools/` (89 tools).

- **Covered:** 90 operations
- **Gap (tracked as GitLab issues):** 250 operations
- **Intentionally skipped:** 16 GoERP `get_single` aliases / base attachment list

Gap issues live in GitLab milestone **Erply Books** ([tracker #137](https://gitlab.com/werkstatt.ee/e-financials-mcp/-/issues/137)). See also [spec-conformance.md](spec-conformance.md) for the implemented-vs-spec verification report.

| Method | Path | Status |
|--------|------|--------|
| `GET` | `/account_entries` | covered: `erply_list_account_entries` |
| `GET` | `/account_entries/aggregate` | gap: E38 #177 |
| `POST` | `/account_entries/external_system_reading_successful` | gap: E38 #177 |
| `POST` | `/account_entries/import_trial_balance` | gap: E38 #177 |
| `GET` | `/account_entries/v2` | gap: E38 #177 |
| `GET` | `/accounts` | covered: `erply_list_accounts` |
| `POST` | `/accounts` | covered: `erply_create_account` |
| `DELETE` | `/accounts/{accountId}` | covered: `erply_delete_account` |
| `PUT` | `/accounts/{accountId}` | covered: `erply_update_account` |
| `POST` | `/accounts/add_accounts` | gap: E40 #179 |
| `POST` | `/accounts/delete` | gap: E40 #179 |
| `GET` | `/accounts/system` | gap: E40 #179 |
| `POST` | `/accounts/system` | gap: E40 #179 |
| `PUT` | `/accounts/system/{accountId}` | gap: E40 #179 |
| `GET` | `/article_rows` | gap: E39 #178 |
| `POST` | `/article_rows/asset_writeoff` | gap: E39 #178 |
| `PUT` | `/article_rows/depreciation/{articleId}` | gap: E39 #178 |
| `POST` | `/article_rows/full_depreciation` | gap: E39 #178 |
| `GET` | `/articles` | covered: `erply_list_articles` |
| `POST` | `/articles` | covered: `erply_create_article` |
| `DELETE` | `/articles/{articleId}` | covered: `erply_delete_article` |
| `PUT` | `/articles/{articleId}` | covered: `erply_update_article` |
| `POST` | `/articles/delete` | gap: E40 #179 |
| `GET` | `/articles/system_articles` | gap: E40 #179 |
| `POST` | `/articles/system_articles` | gap: E40 #179 |
| `PUT` | `/articles/system_articles/{articleFeatureId}` | gap: E40 #179 |
| `GET` | `/articles/system_articles/{featureType}` | gap: E40 #179 |
| `POST` | `/articles/tracker` | gap: E40 #179 |
| `POST` | `/articles/update_all_tax_rates` | gap: E40 #179 |
| `GET` | `/attachments` | skipped (GoERP `get_single` alias / base list) |
| `POST` | `/attachments` | covered: `erply_create_attachment` |
| `DELETE` | `/attachments/{attachmentId}` | covered: `erply_delete_attachment` |
| `GET` | `/attachments/{attachmentId}/child` | covered: `erply_get_attachment_child` |
| `POST` | `/attachments/add_purchase_order` | covered: `erply_create_purchase_order_from_attachment` |
| `GET` | `/attachments/all` | covered: `erply_list_attachments` |
| `DELETE` | `/attachments/all/{activityItemAttachmentId}` | covered: `erply_delete_activity_attachment` |
| `GET` | `/attachments/all/{attachmentId}` | covered: `erply_get_attachment` |
| `GET` | `/attachments/all/get_single` | skipped (GoERP `get_single` alias / base list) |
| `POST` | `/attachments/confirm` | covered: `erply_confirm_attachment` |
| `POST` | `/attachments/delete` | covered: `erply_delete_attachment_via_post` |
| `GET` | `/attachments/digi/{attachmentId}` | covered: `erply_get_digi_attachment` |
| `POST` | `/attachments/digi/base64` | covered: `erply_create_digi_base64` |
| `POST` | `/attachments/digi/country_from_parser` | covered: `erply_get_digi_country_from_parser` |
| `POST` | `/attachments/digi/form` | covered: `erply_create_digi_form` |
| `GET` | `/attachments/digi/get_single` | skipped (GoERP `get_single` alias / base list) |
| `PUT` | `/attachments/digitize/{itemId}` | covered: `erply_digitize_attachment` |
| `POST` | `/attachments/erply_invoice_only` | covered: `erply_link_attachment_to_erply_invoice` |
| `PUT` | `/attachments/erply_invoice_only/{documentId}` | covered: `erply_link_attachment_to_erply_invoice` |
| `GET` | `/attachments/get_single/child` | skipped (GoERP `get_single` alias / base list) |
| `GET` | `/attachments/html_template` | covered: `erply_get_attachment_html_template` |
| `POST` | `/attachments/kyc` | covered: `erply_submit_kyc` |
| `POST` | `/attachments/kyc/json` | covered: `erply_submit_kyc_json` |
| `PUT` | `/attachments/mark_attachment_as_opened/{itemId}` | covered: `erply_mark_attachment_opened` |
| `POST` | `/attachments/multiple` | covered: `erply_create_attachments_multiple` |
| `PUT` | `/attachments/not_digitizable/{itemId}` | covered: `erply_mark_attachment_not_digitizable` |
| `GET` | `/attachments/parse/{attachmentId}` | covered: `erply_parse_attachment` |
| `GET` | `/attachments/parse/get_single` | skipped (GoERP `get_single` alias / base list) |
| `GET` | `/attachments/preview` | covered: `erply_get_attachment_preview` |
| `POST` | `/attachments/simple` | covered: `erply_create_attachment_simple` |
| `GET` | `/attachments/summary_invoice/{attachmentId}` | covered: `erply_get_summary_invoice` |
| `GET` | `/attachments/summary_invoice/get_single` | skipped (GoERP `get_single` alias / base list) |
| `GET` | `/attachments/zip_file/{documentId}` | covered: `erply_get_attachments_zip` |
| `GET` | `/attachments/zip_file/get_single` | skipped (GoERP `get_single` alias / base list) |
| `GET` | `/attributes` | gap: E41 #180 |
| `POST` | `/attributes` | gap: E41 #180 |
| `DELETE` | `/attributes/{activityItemId}` | gap: E41 #180 |
| `PUT` | `/attributes/{activityItemId}` | gap: E41 #180 |
| `GET` | `/attributes/asset_tracker_info` | gap: E41 #180 |
| `POST` | `/attributes/car_in` | gap: E41 #180 |
| `POST` | `/attributes/items_for_all_organisation` | gap: E41 #180 |
| `DELETE` | `/attributes/items_for_all_organisation/{name}` | gap: E41 #180 |
| `GET` | `/attributes/v2` | gap: E41 #180 |
| `POST` | `/attributes/v2` | gap: E41 #180 |
| `PUT` | `/attributes/v2/{activityItemId}` | gap: E41 #180 |
| `POST` | `/bulk` | gap: E46 #185 |
| `GET` | `/customers` | covered: `erply_list_customers` |
| `POST` | `/customers` | covered: `erply_create_customer` |
| `DELETE` | `/customers/{customerId}` | covered: `erply_delete_customer` |
| `PUT` | `/customers/{customerId}` | covered: `erply_update_customer` |
| `GET` | `/customers/bank_accounts/{bankAccountId}/customerId/{customerId}` | gap: E29 #168 |
| `DELETE` | `/customers/bank_accounts/{bankAccountId}/customerId/{id}` | gap: E29 #168 |
| `GET` | `/customers/bank_accounts/{customerId}` | gap: E29 #168 |
| `POST` | `/customers/bank_accounts/{customerId}` | gap: E29 #168 |
| `PUT` | `/customers/bank_accounts/{customerId}` | gap: E29 #168 |
| `GET` | `/customers/bank_accounts/get_single` | skipped (GoERP `get_single` alias / base list) |
| `GET` | `/customers/bank_accounts/get_single/v2` | skipped (GoERP `get_single` alias / base list) |
| `POST` | `/customers/delete` | gap: E29 #168 |
| `GET` | `/customers/entity_balance` | gap: E29 #168 |
| `PUT` | `/customers/mark_as_anonymous/{customerId}` | gap: E29 #168 |
| `GET` | `/customers/project_balance` | gap: E29 #168 |
| `GET` | `/customers/report/{customerId}` | gap: E29 #168 |
| `GET` | `/customers/report/get_single` | skipped (GoERP `get_single` alias / base list) |
| `POST` | `/customers/update_all_tax_rate` | gap: E29 #168 |
| `POST` | `/customers/v2` | gap: E29 #168 |
| `PUT` | `/customers/v2/{customerId}` | gap: E29 #168 |
| `POST` | `/integrations/add_einvoice_channel` | gap: E46 #185 |
| `POST` | `/integrations/integrate/{partnerType}` | gap: E46 #185 |
| `POST` | `/integrations/process_custom_api` | gap: E46 #185 |
| `POST` | `/integrations/stop_custom_api` | gap: E46 #185 |
| `POST` | `/integrations/sync` | gap: E46 #185 |
| `DELETE` | `/inventory/{invoiceId}` | gap: E45 #184 |
| `GET` | `/inventory/{type}` | gap: E45 #184 |
| `POST` | `/inventory/{type}` | gap: E45 #184 |
| `PUT` | `/inventory/{type}/{documentId}` | gap: E45 #184 |
| `POST` | `/inventory/archive_unused_batches` | gap: E45 #184 |
| `GET` | `/inventory/customer_priceplan` | gap: E45 #184 |
| `POST` | `/inventory/customer_priceplan` | gap: E45 #184 |
| `DELETE` | `/inventory/customer_priceplan/{priceplanId}` | gap: E45 #184 |
| `PUT` | `/inventory/customer_priceplan/{priceplanId}` | gap: E45 #184 |
| `POST` | `/inventory/make_production` | gap: E45 #184 |
| `POST` | `/inventory/prepare_production_tracker_multi_result` | gap: E45 #184 |
| `POST` | `/inventory/production_measurement` | gap: E45 #184 |
| `GET` | `/inventory/production_tracker` | gap: E45 #184 |
| `POST` | `/inventory/production_tracker` | gap: E45 #184 |
| `DELETE` | `/inventory/production_tracker/{articleRowId}` | gap: E45 #184 |
| `PUT` | `/inventory/production_tracker/{articleRowId}` | gap: E45 #184 |
| `GET` | `/inventory/products` | gap: E45 #184 |
| `POST` | `/inventory/products` | gap: E45 #184 |
| `DELETE` | `/inventory/products/{articleId}` | gap: E45 #184 |
| `PUT` | `/inventory/products/{articleId}` | gap: E45 #184 |
| `GET` | `/inventory/recipes` | gap: E45 #184 |
| `POST` | `/inventory/recipes` | gap: E45 #184 |
| `DELETE` | `/inventory/recipes/{recipeId}` | gap: E45 #184 |
| `PUT` | `/inventory/recipes/{recipeId}` | gap: E45 #184 |
| `GET` | `/inventory/supplier_priceplan` | gap: E45 #184 |
| `POST` | `/inventory/supplier_priceplan` | gap: E45 #184 |
| `PUT` | `/inventory/supplier_priceplan/{priceplanId}` | gap: E45 #184 |
| `DELETE` | `/inventory/supplier_priceplan/{pricePlanId}` | gap: E45 #184 |
| `POST` | `/inventory/update_prices_with_code` | gap: E45 #184 |
| `GET` | `/inventory/waste_report` | gap: E45 #184 |
| `GET` | `/invoices` | covered: `erply_list_invoices` |
| `POST` | `/invoices` | covered: `erply_create_invoice` |
| `GET` | `/invoices/{documentId}` | covered: `erply_get_invoice` |
| `PUT` | `/invoices/{documentId}` | covered: `erply_update_invoice` |
| `DELETE` | `/invoices/{documentId}/rows/{articleRowId}` | gap: E31 #170 |
| `DELETE` | `/invoices/{invoiceId}` | covered: `erply_delete_invoice` |
| `POST` | `/invoices/add_attribute` | gap: E31 #170 |
| `POST` | `/invoices/add_dimension` | gap: E31 #170 |
| `POST` | `/invoices/add_document_connection` | gap: E31 #170 |
| `POST` | `/invoices/add_opposite` | gap: E31 #170 |
| `POST` | `/invoices/add_to_queue` | gap: E31 #170 |
| `POST` | `/invoices/confirm_invoices` | covered: `erply_confirm_invoices` |
| `POST` | `/invoices/delete` | gap: E31 #170 |
| `POST` | `/invoices/delete_multiple_and_payments` | gap: E31 #170 |
| `GET` | `/invoices/einvoice` | covered: `erply_get_einvoice` |
| `POST` | `/invoices/email/{hash}` | gap: E32 #171 |
| `POST` | `/invoices/email/{hash}/{documentId}` | gap: E32 #171 |
| `POST` | `/invoices/email/simple` | covered: `erply_send_invoice_email` |
| `POST` | `/invoices/forward_to_user` | gap: E31 #170 |
| `GET` | `/invoices/get_single` | skipped (GoERP `get_single` alias / base list) |
| `GET` | `/invoices/history` | gap: E30 #169 |
| `POST` | `/invoices/import/file` | gap: E32 #171 |
| `POST` | `/invoices/import/formsubmit` | gap: E32 #171 |
| `GET` | `/invoices/new_number` | gap: E30 #169 |
| `POST` | `/invoices/new_number` | gap: E30 #169 |
| `POST` | `/invoices/override` | gap: E31 #170 |
| `GET` | `/invoices/parsed_invoice_info_validation` | gap: E30 #169 |
| `DELETE` | `/invoices/partner` | gap: E31 #170 |
| `GET` | `/invoices/partner` | covered: `erply_list_partner_invoices` |
| `POST` | `/invoices/partner` | covered: `erply_create_partner_invoice` |
| `PUT` | `/invoices/partner/{documentId}` | gap: E31 #170 |
| `GET` | `/invoices/pdf/{documentId}` | gap: E32 #171 |
| `GET` | `/invoices/pdf/get_single` | skipped (GoERP `get_single` alias / base list) |
| `GET` | `/invoices/pdf/v2/{documentId}` | covered: `erply_get_invoice_pdf` |
| `GET` | `/invoices/pdf/v2/get_single` | skipped (GoERP `get_single` alias / base list) |
| `POST` | `/invoices/prepare_rows` | gap: E31 #170 |
| `POST` | `/invoices/recurring` | covered: `erply_create_recurring_invoice` |
| `PUT` | `/invoices/recurring/{documentId}` | covered: `erply_update_recurring_invoice` |
| `POST` | `/invoices/send_einvoices` | covered: `erply_send_einvoices` |
| `POST` | `/invoices/send_erply_invoice/{documentId}` | gap: E32 #171 |
| `POST` | `/invoices/send_erply_invoices` | gap: E32 #171 |
| `POST` | `/invoices/split_rows` | gap: E31 #170 |
| `PUT` | `/invoices/split_rows/{documentId}` | gap: E31 #170 |
| `GET` | `/invoices/templates` | gap: E30 #169 |
| `POST` | `/invoices/templates` | gap: E30 #169 |
| `DELETE` | `/invoices/templates/{documentInfoId}` | gap: E30 #169 |
| `GET` | `/invoices/templates/{documentInfoId}` | gap: E30 #169 |
| `PUT` | `/invoices/templates/{documentInfoId}` | gap: E30 #169 |
| `GET` | `/invoices/templates/get_single` | skipped (GoERP `get_single` alias / base list) |
| `POST` | `/invoices/use_prepayment` | gap: E31 #170 |
| `POST` | `/messages/send_sms` | gap: E46 #185 |
| `GET` | `/organisation` | covered: `erply_get_organisation` |
| `PUT` | `/organisation/{organisationId}` | gap: E43 #182 |
| `GET` | `/organisation/all` | gap: E42 #181 |
| `POST` | `/organisation/bulk` | gap: E43 #182 |
| `POST` | `/organisation/create_apikey` | gap: E43 #182 |
| `POST` | `/organisation/create_key` | gap: E43 #182 |
| `POST` | `/organisation/edit` | gap: E43 #182 |
| `PUT` | `/organisation/edit/{organisationId}` | gap: E43 #182 |
| `GET` | `/organisation/get_goerp_token` | gap: E42 #181 |
| `GET` | `/organisation/is_key_valid` | gap: E42 #181 |
| `GET` | `/organisation/is_token_valid` | gap: E42 #181 |
| `GET` | `/organisation/last_history_action` | gap: E42 #181 |
| `POST` | `/organisation/send_email` | gap: E43 #182 |
| `GET` | `/organisation/terms` | gap: E42 #181 |
| `POST` | `/organisation/terms` | gap: E43 #182 |
| `PUT` | `/organisation/terms/{organisationTermId}` | gap: E43 #182 |
| `GET` | `/payments` | covered: `erply_list_payments` |
| `POST` | `/payments` | covered: `erply_create_payment` |
| `DELETE` | `/payments/{paymentId}` | covered: `erply_delete_payment` |
| `PUT` | `/payments/{paymentId}` | covered: `erply_update_payment` |
| `POST` | `/payments/bank_import` | covered: `erply_bank_import` |
| `POST` | `/payments/bank_import/v2` | covered: `erply_bank_import_v2` |
| `POST` | `/payments/connect_payment_with_documents` | covered: `erply_connect_payment_with_documents` |
| `POST` | `/payments/delete` | gap: E44 #183 |
| `POST` | `/payments/delete_all_payments` | gap: E44 #183 |
| `POST` | `/payments/import` | covered: `erply_import_payment` |
| `GET` | `/payments/pending_payments` | covered: `erply_list_pending_payments` |
| `POST` | `/payments/remove_lock_simple` | gap: E44 #183 |
| `POST` | `/payments/remove_lock/{paymentId}` | gap: E44 #183 |
| `POST` | `/payments/save_all_payments` | covered: `erply_save_all_payment_imports` |
| `POST` | `/payments/sepa_payments` | gap: E44 #183 |
| `POST` | `/payments/sepa_payments/json_format` | covered: `erply_sepa_payments` |
| `POST` | `/payments/settle_prepayments` | covered: `erply_settle_prepayments` |
| `POST` | `/processes/yard/add_row` | gap: E46 #185 |
| `POST` | `/processes/yard/car_in` | gap: E46 #185 |
| `GET` | `/projects` | covered: `erply_list_projects` |
| `POST` | `/projects` | covered: `erply_create_project` |
| `DELETE` | `/projects/{projectId}` | covered: `erply_delete_project` |
| `PUT` | `/projects/{projectId}` | covered: `erply_update_project` |
| `POST` | `/projects/delete` | gap: E33 #172 |
| `GET` | `/projects/groups` | gap: E33 #172 |
| `POST` | `/projects/groups` | gap: E33 #172 |
| `DELETE` | `/projects/groups/{projectId}` | gap: E33 #172 |
| `PUT` | `/projects/groups/{projectId}` | gap: E33 #172 |
| `POST` | `/report_generator` | gap: E34 #173 |
| `GET` | `/report_generator/average_inventory_report` | gap: E35 #174 |
| `GET` | `/report_generator/columns` | gap: E34 #173 |
| `GET` | `/report_generator/contact_invoice_result_report` | gap: E34 #173 |
| `POST` | `/report_generator/csv` | gap: E34 #173 |
| `POST` | `/report_generator/custom_excel` | gap: E34 #173 |
| `POST` | `/report_generator/edit` | gap: E34 #173 |
| `POST` | `/report_generator/email` | gap: E34 #173 |
| `POST` | `/report_generator/file` | gap: E34 #173 |
| `GET` | `/report_generator/file/{type}` | gap: E34 #173 |
| `POST` | `/report_generator/file/{type}/json_format` | gap: E34 #173 |
| `POST` | `/report_generator/multiple` | gap: E34 #173 |
| `GET` | `/report_generator/production_analyzer` | gap: E35 #174 |
| `POST` | `/report_generator/production_analyzer` | gap: E35 #174 |
| `DELETE` | `/report_generator/production_analyzer/{articleRowId}` | gap: E35 #174 |
| `PUT` | `/report_generator/production_analyzer/{articleRowId}` | gap: E35 #174 |
| `GET` | `/report_generator/production_planner` | gap: E35 #174 |
| `POST` | `/report_generator/send_report` | gap: E34 #173 |
| `POST` | `/report_generator/send_to_ai` | gap: E35 #174 |
| `POST` | `/report_generator/swagger_assistance` | gap: E35 #174 |
| `POST` | `/report_generator/update_values` | gap: E34 #173 |
| `GET` | `/report_generator/user_defined` | gap: E34 #173 |
| `POST` | `/report_generator/xlsx` | gap: E34 #173 |
| `GET` | `/report_generator/xml` | gap: E34 #173 |
| `GET` | `/reports/aged` | covered: `erply_aged_receivables` |
| `GET` | `/reports/aged_report` | gap: E36 #175 |
| `GET` | `/reports/balance_sheet` | covered: `erply_balance_sheet` |
| `GET` | `/reports/contact_balance` | covered: `erply_contact_balance` |
| `POST` | `/reports/custom_printing` | gap: E36 #175 |
| `GET` | `/reports/daybook` | covered: `erply_daybook` |
| `GET` | `/reports/file/{fileType}/file` | gap: E36 #175 |
| `GET` | `/reports/file/{type}/json_format` | gap: E36 #175 |
| `GET` | `/reports/fixed_assets` | covered: `erply_fixed_assets` |
| `GET` | `/reports/general_ledger` | covered: `erply_general_ledger` |
| `GET` | `/reports/income_compare` | gap: E36 #175 |
| `GET` | `/reports/income_sheet` | covered: `erply_income_sheet` |
| `POST` | `/reports/send_report_by_email/{fileType}` | gap: E36 #175 |
| `GET` | `/reports/tax/contacts` | gap: E36 #175 |
| `GET` | `/reports/tax/ee/vat` | covered: `erply_vat_ee` |
| `GET` | `/reports/tax/ee/vd` | gap: E36 #175 |
| `GET` | `/reports/tax/lt/vat` | gap: E36 #175 |
| `GET` | `/reports/tax/lv/vat` | gap: E36 #175 |
| `GET` | `/reports/trial_balance` | covered: `erply_trial_balance` |
| `GET` | `/reports/user_specific_accounts` | gap: E36 #175 |
| `GET` | `/reports/vat_compare` | gap: E36 #175 |
| `GET` | `/reports/vat_report` | gap: E36 #175 |
| `GET` | `/settings/add_attributes_to_erply_invoices` | gap: E42 #181 |
| `POST` | `/settings/add_integration` | gap: E43 #182 |
| `POST` | `/settings/add_new_user` | gap: E43 #182 |
| `GET` | `/settings/all_subscription_invoices` | gap: E42 #181 |
| `GET` | `/settings/api_whitelist` | gap: E42 #181 |
| `POST` | `/settings/api_whitelist` | gap: E43 #182 |
| `DELETE` | `/settings/api_whitelist/{id}` | gap: E43 #182 |
| `PUT` | `/settings/api_whitelist/{id}` | gap: E43 #182 |
| `GET` | `/settings/api_whitelistV2` | gap: E42 #181 |
| `GET` | `/settings/approve_sending_reminders` | gap: E42 #181 |
| `GET` | `/settings/auth_permissions` | gap: E42 #181 |
| `DELETE` | `/settings/auth_permissions/{username}` | gap: E43 #182 |
| `POST` | `/settings/auth_permissions/{username}` | gap: E43 #182 |
| `PUT` | `/settings/auth_permissions/{username}` | gap: E43 #182 |
| `POST` | `/settings/auth_permissions/add_suspend_all_org/{username}` | gap: E43 #182 |
| `POST` | `/settings/auth_permissions/add_suspend/{username}` | gap: E43 #182 |
| `PUT` | `/settings/auth_permissions/change_status/{id}` | gap: E43 #182 |
| `POST` | `/settings/auth_permissions/change_status/{username}` | gap: E43 #182 |
| `POST` | `/settings/auth_permissions/make_admin/{username}` | gap: E43 #182 |
| `PUT` | `/settings/auth_permissions/make_admin/{username}` | gap: E43 #182 |
| `POST` | `/settings/auth_permissions/remove_admin/{username}` | gap: E43 #182 |
| `PUT` | `/settings/auth_permissions/remove_admin/{username}` | gap: E43 #182 |
| `GET` | `/settings/auth_permissions/users` | gap: E42 #181 |
| `POST` | `/settings/change_payer_organisation` | gap: E43 #182 |
| `POST` | `/settings/change_subscription` | gap: E43 #182 |
| `GET` | `/settings/countries` | gap: E42 #181 |
| `GET` | `/settings/currency_rates` | gap: E42 #181 |
| `POST` | `/settings/custom_plan_request` | gap: E43 #182 |
| `GET` | `/settings/default_priceplans` | gap: E42 #181 |
| `GET` | `/settings/dictionaries/{dictionaryCode}` | covered: `erply_get_dictionary` |
| `GET` | `/settings/ee/get_partner_code` | gap: E42 #181 |
| `GET` | `/settings/find_valid_payer_organisations` | gap: E42 #181 |
| `GET` | `/settings/get_payer_organisation_documents` | gap: E42 #181 |
| `POST` | `/settings/import` | gap: E43 #182 |
| `POST` | `/settings/invalidate_external_session_key` | gap: E43 #182 |
| `GET` | `/settings/me` | gap: E42 #181 |
| `GET` | `/settings/parameters` | gap: E42 #181 |
| `POST` | `/settings/parameters` | gap: E43 #182 |
| `GET` | `/settings/parameters_encrypted` | gap: E42 #181 |
| `POST` | `/settings/parameters_encrypted` | gap: E43 #182 |
| `PUT` | `/settings/parameters_encrypted/{userId}` | gap: E43 #182 |
| `PUT` | `/settings/parameters/{userId}` | gap: E43 #182 |
| `POST` | `/settings/process_external_session_key` | gap: E43 #182 |
| `POST` | `/settings/revert` | gap: E43 #182 |
| `POST` | `/settings/send_external_session_key_request_email` | gap: E43 #182 |
| `POST` | `/settings/setup/{type}` | gap: E43 #182 |
| `GET` | `/settings/system_article` | gap: E42 #181 |
| `POST` | `/settings/system_article` | gap: E43 #182 |
| `PUT` | `/settings/system_article/{id}` | gap: E43 #182 |
| `GET` | `/settings/translations` | gap: E42 #181 |
| `GET` | `/settings/unpaid_subscription_invoices` | gap: E42 #181 |
| `POST` | `/settings/update_balances` | gap: E43 #182 |
| `POST` | `/settings/update_token` | gap: E43 #182 |
| `POST` | `/settings/verify_with_smart_id` | gap: E43 #182 |
| `POST` | `/tasks/erply/syncArticlesAndVatRates` | gap: E46 #185 |
| `POST` | `/tasks/erply/syncCustomerInitialBalances` | gap: E46 #185 |
| `POST` | `/tasks/erply/syncCustomers` | gap: E46 #185 |
| `POST` | `/tasks/erply/syncDocuments` | gap: E46 #185 |
| `POST` | `/tasks/erply/syncProductIds` | gap: E46 #185 |
| `POST` | `/tasks/erply/syncProjects` | gap: E46 #185 |
| `POST` | `/tasks/erply/syncUndefinedPaymentsCheck` | gap: E46 #185 |
| `POST` | `/tasks/partner_sync` | gap: E46 #185 |
| `POST` | `/tasks/partner_sync/syncErplyCustomers` | gap: E46 #185 |
| `POST` | `/tasks/run` | gap: E46 #185 |
| `POST` | `/tasks/stop` | gap: E46 #185 |
| `GET` | `/tax_rates` | covered: `erply_list_tax_rates` |
| `POST` | `/tax_rates` | covered: `erply_create_tax_rate` |
| `DELETE` | `/tax_rates/{taxRateId}` | covered: `erply_delete_tax_rate` |
| `PUT` | `/tax_rates/{taxRateId}` | covered: `erply_update_tax_rate` |
| `POST` | `/tax_rates/delete` | gap: E40 #179 |
| `GET` | `/transaction_entries` | covered: `erply_list_transaction_entries` |
| `POST` | `/transaction_entries` | covered: `erply_create_transaction_entry` |
| `DELETE` | `/transaction_entries/{transactionEntryId}` | covered: `erply_delete_transaction_entry` |
| `GET` | `/transaction_entries/{transactionEntryId}` | covered: `erply_get_transaction_entry` |
| `PUT` | `/transaction_entries/{transactionEntryId}` | covered: `erply_update_transaction_entry` |
| `GET` | `/transaction_entries/{transactionEntryId}/v2` | gap: E37 #176 |
| `POST` | `/transaction_entries/change_transaction_status` | gap: E37 #176 |
| `POST` | `/transaction_entries/delete` | gap: E37 #176 |
| `GET` | `/transaction_entries/get_single` | skipped (GoERP `get_single` alias / base list) |
| `GET` | `/transaction_entries/get_single/v2` | skipped (GoERP `get_single` alias / base list) |
| `GET` | `/transaction_entries/history` | gap: E37 #176 |
| `POST` | `/transaction_entries/project_editor` | gap: E37 #176 |
| `GET` | `/transaction_entries/summary_report` | gap: E37 #176 |
| `GET` | `/transaction_entries/transaction_summary` | gap: E37 #176 |
| `POST` | `/transaction_entries/v2` | gap: E37 #176 |
