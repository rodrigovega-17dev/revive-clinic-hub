-- Current State Migration
-- This migration adds RLS policies, indexes, and final configurations

-- Create remaining tables
-- Create indexes
CREATE INDEX "idx_appointments_clinic_id" ON "public"."appointments" USING "btree" ("clinic_id");
CREATE INDEX "idx_appointments_start_time" ON "public"."appointments" USING "btree" ("start_time");
CREATE INDEX "idx_appointments_therapist_start_time" ON "public"."appointments" USING "btree" ("therapist_id", "start_time");
CREATE INDEX "idx_clients_clinic_id" ON "public"."clients" USING "btree" ("clinic_id");
CREATE INDEX "idx_clinic_subscriptions_clinic_id" ON "public"."clinic_subscriptions" USING "btree" ("clinic_id");
CREATE INDEX "idx_clinic_subscriptions_status" ON "public"."clinic_subscriptions" USING "btree" ("status");
CREATE INDEX "idx_clinics_is_active" ON "public"."clinics" USING "btree" ("is_active");
CREATE INDEX "idx_clinics_slug" ON "public"."clinics" USING "btree" ("slug");
CREATE INDEX "idx_daily_cash_summary_clinic_id" ON "public"."daily_cash_summary" USING "btree" ("clinic_id");
CREATE INDEX "idx_expenses_clinic_id" ON "public"."expenses" USING "btree" ("clinic_id");
CREATE INDEX "idx_payments_clinic_id" ON "public"."payments" USING "btree" ("clinic_id");
CREATE INDEX "idx_profiles_clinic_id" ON "public"."profiles" USING "btree" ("clinic_id");
CREATE INDEX "idx_profiles_is_clinic_owner" ON "public"."profiles" USING "btree" ("is_clinic_owner");
CREATE INDEX "idx_security_settings_clinic_id" ON "public"."security_settings" USING "btree" ("clinic_id");
CREATE INDEX "idx_security_settings_user_id" ON "public"."security_settings" USING "btree" ("user_id");
CREATE INDEX "idx_shifts_clinic_id" ON "public"."shifts" USING "btree" ("clinic_id");
CREATE INDEX "idx_subscription_invoices_clinic_id" ON "public"."subscription_invoices" USING "btree" ("clinic_id");
CREATE INDEX "idx_subscription_plans_active" ON "public"."subscription_plans" USING "btree" ("is_active");
CREATE INDEX "idx_subscription_plans_slug" ON "public"."subscription_plans" USING "btree" ("slug");
CREATE INDEX "idx_subscription_usage_clinic_date" ON "public"."subscription_usage" USING "btree" ("clinic_id", "date");
CREATE INDEX "idx_suppliers_clinic_id" ON "public"."suppliers" USING "btree" ("clinic_id");
CREATE INDEX "idx_sync_logs_clinic_id" ON "public"."sync_logs" USING "btree" ("clinic_id");
CREATE INDEX "idx_therapists_clinic_id" ON "public"."therapists" USING "btree" ("clinic_id");
CREATE INDEX "idx_treatments_clinic_id" ON "public"."treatments" USING "btree" ("clinic_id");
CREATE INDEX "idx_user_preferences_clinic_id" ON "public"."user_preferences" USING "btree" ("clinic_id");
CREATE INDEX "idx_user_preferences_user_id" ON "public"."user_preferences" USING "btree" ("user_id");

-- Create RLS policies
CREATE POLICY "Authenticated users can view subscription plans" ON "public"."subscription_plans" FOR SELECT TO "authenticated" USING (true);
CREATE POLICY "Clinic owners can manage appointments" ON "public"."appointments" USING ((("clinic_id" = "public"."get_user_clinic_id"()) AND "public"."is_clinic_owner"()));
CREATE POLICY "Clinic owners can manage clients" ON "public"."clients" USING ((("clinic_id" = "public"."get_user_clinic_id"()) AND "public"."is_clinic_owner"()));
CREATE POLICY "Clinic owners can manage daily cash summary" ON "public"."daily_cash_summary" USING ((("clinic_id" = "public"."get_user_clinic_id"()) AND "public"."is_clinic_owner"()));
CREATE POLICY "Clinic owners can manage expenses" ON "public"."expenses" USING ((("clinic_id" = "public"."get_user_clinic_id"()) AND "public"."is_clinic_owner"()));
CREATE POLICY "Clinic owners can manage invoices" ON "public"."subscription_invoices" USING ((("clinic_id" = "public"."get_user_clinic_id"()) AND "public"."is_clinic_owner"()));
CREATE POLICY "Clinic owners can manage payments" ON "public"."payments" USING ((("clinic_id" = "public"."get_user_clinic_id"()) AND "public"."is_clinic_owner"()));
CREATE POLICY "Clinic owners can manage shifts" ON "public"."shifts" USING ((("clinic_id" = "public"."get_user_clinic_id"()) AND "public"."is_clinic_owner"()));
CREATE POLICY "Clinic owners can manage subscriptions" ON "public"."clinic_subscriptions" USING ((("clinic_id" = "public"."get_user_clinic_id"()) AND "public"."is_clinic_owner"()));
CREATE POLICY "Clinic owners can manage suppliers" ON "public"."suppliers" USING ((("clinic_id" = "public"."get_user_clinic_id"()) AND "public"."is_clinic_owner"()));
CREATE POLICY "Clinic owners can manage sync logs" ON "public"."sync_logs" USING ((("clinic_id" = "public"."get_user_clinic_id"()) AND "public"."is_clinic_owner"()));
CREATE POLICY "Clinic owners can manage their clinic" ON "public"."clinics" USING (("id" IN ( SELECT "profiles"."clinic_id"
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."is_clinic_owner" = true)))));
CREATE POLICY "Clinic owners can manage therapists" ON "public"."therapists" USING ((("clinic_id" = "public"."get_user_clinic_id"()) AND "public"."is_clinic_owner"()));
CREATE POLICY "Clinic owners can manage treatments" ON "public"."treatments" USING ((("clinic_id" = "public"."get_user_clinic_id"()) AND "public"."is_clinic_owner"()));
CREATE POLICY "Clinic owners can manage usage" ON "public"."subscription_usage" USING ((("clinic_id" = "public"."get_user_clinic_id"()) AND "public"."is_clinic_owner"()));
CREATE POLICY "Clinic owners can update own clinic" ON "public"."clinics" FOR UPDATE USING ((("id" = "public"."get_user_clinic_id"()) AND "public"."is_clinic_owner"()));
CREATE POLICY "Users can manage own preferences" ON "public"."user_preferences" USING (("user_id" = "auth"."uid"()));
CREATE POLICY "Users can manage own security settings" ON "public"."security_settings" USING (("user_id" = "auth"."uid"()));
CREATE POLICY "Users can manage their own preferences" ON "public"."user_preferences" USING (("user_id" = "auth"."uid"()));
CREATE POLICY "Users can manage their own security settings" ON "public"."security_settings" USING (("user_id" = "auth"."uid"()));
CREATE POLICY "Users can only access their clinic's data" ON "public"."appointments" USING (("clinic_id" = ( SELECT "profiles"."clinic_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));
CREATE POLICY "Users can only access their clinic's data" ON "public"."clients" USING (("clinic_id" = ( SELECT "profiles"."clinic_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));
CREATE POLICY "Users can only access their clinic's data" ON "public"."daily_cash_summary" USING (("clinic_id" = ( SELECT "profiles"."clinic_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));
CREATE POLICY "Users can only access their clinic's data" ON "public"."expenses" USING (("clinic_id" = ( SELECT "profiles"."clinic_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));
CREATE POLICY "Users can only access their clinic's data" ON "public"."payments" USING (("clinic_id" = ( SELECT "profiles"."clinic_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));
CREATE POLICY "Users can only access their clinic's data" ON "public"."shifts" USING (("clinic_id" = ( SELECT "profiles"."clinic_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));
CREATE POLICY "Users can only access their clinic's data" ON "public"."suppliers" USING (("clinic_id" = ( SELECT "profiles"."clinic_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));
CREATE POLICY "Users can only access their clinic's data" ON "public"."sync_logs" USING (("clinic_id" = ( SELECT "profiles"."clinic_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));
CREATE POLICY "Users can only access their clinic's data" ON "public"."therapists" USING (("clinic_id" = ( SELECT "profiles"."clinic_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));
CREATE POLICY "Users can only access their clinic's data" ON "public"."treatments" USING (("clinic_id" = ( SELECT "profiles"."clinic_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));
CREATE POLICY "Users can only access their clinic's invoices" ON "public"."subscription_invoices" USING (("clinic_id" = ( SELECT "profiles"."clinic_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));
CREATE POLICY "Users can only access their clinic's subscriptions" ON "public"."clinic_subscriptions" USING (("clinic_id" = ( SELECT "profiles"."clinic_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));
CREATE POLICY "Users can only access their clinic's usage" ON "public"."subscription_usage" USING (("clinic_id" = ( SELECT "profiles"."clinic_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));
CREATE POLICY "Users can update own profile" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id"));
CREATE POLICY "Users can update their own profile" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id"));
CREATE POLICY "Users can view clinic appointments" ON "public"."appointments" FOR SELECT USING (("clinic_id" = "public"."get_user_clinic_id"()));
CREATE POLICY "Users can view clinic clients" ON "public"."clients" FOR SELECT USING (("clinic_id" = "public"."get_user_clinic_id"()));
CREATE POLICY "Users can view clinic daily cash summary" ON "public"."daily_cash_summary" FOR SELECT USING (("clinic_id" = "public"."get_user_clinic_id"()));
CREATE POLICY "Users can view clinic expenses" ON "public"."expenses" FOR SELECT USING (("clinic_id" = "public"."get_user_clinic_id"()));
CREATE POLICY "Users can view clinic payments" ON "public"."payments" FOR SELECT USING (("clinic_id" = "public"."get_user_clinic_id"()));
CREATE POLICY "Users can view clinic shifts" ON "public"."shifts" FOR SELECT USING (("clinic_id" = "public"."get_user_clinic_id"()));
CREATE POLICY "Users can view clinic suppliers" ON "public"."suppliers" FOR SELECT USING (("clinic_id" = "public"."get_user_clinic_id"()));
CREATE POLICY "Users can view clinic sync logs" ON "public"."sync_logs" FOR SELECT USING (("clinic_id" = "public"."get_user_clinic_id"()));
CREATE POLICY "Users can view clinic therapists" ON "public"."therapists" FOR SELECT USING (("clinic_id" = "public"."get_user_clinic_id"()));
CREATE POLICY "Users can view clinic treatments" ON "public"."treatments" FOR SELECT USING (("clinic_id" = "public"."get_user_clinic_id"()));
CREATE POLICY "Users can view own clinic" ON "public"."clinics" FOR SELECT USING (("id" = "public"."get_user_clinic_id"()));
CREATE POLICY "Users can view own clinic invoices" ON "public"."subscription_invoices" FOR SELECT USING (("clinic_id" = "public"."get_user_clinic_id"()));
CREATE POLICY "Users can view own clinic subscriptions" ON "public"."clinic_subscriptions" FOR SELECT USING (("clinic_id" = "public"."get_user_clinic_id"()));
CREATE POLICY "Users can view own clinic usage" ON "public"."subscription_usage" FOR SELECT USING (("clinic_id" = "public"."get_user_clinic_id"()));
CREATE POLICY "Users can view own preferences" ON "public"."user_preferences" FOR SELECT USING (("user_id" = "auth"."uid"()));
CREATE POLICY "Users can view own profile" ON "public"."profiles" FOR SELECT USING (("auth"."uid"() = "id"));
CREATE POLICY "Users can view own security settings" ON "public"."security_settings" FOR SELECT USING (("user_id" = "auth"."uid"()));
CREATE POLICY "Users can view subscription plans" ON "public"."subscription_plans" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));
CREATE POLICY "Users can view their own clinic" ON "public"."clinics" FOR SELECT USING (("id" IN ( SELECT "profiles"."clinic_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));
CREATE POLICY "Users can view their own preferences" ON "public"."user_preferences" FOR SELECT USING (("user_id" = "auth"."uid"()));
CREATE POLICY "Users can view their own profile" ON "public"."profiles" FOR SELECT USING (("auth"."uid"() = "id"));
CREATE POLICY "Users can view their own security settings" ON "public"."security_settings" FOR SELECT USING (("user_id" = "auth"."uid"()));

-- Create triggers
CREATE OR REPLACE TRIGGER "update_appointments_updated_at" BEFORE UPDATE ON "public"."appointments" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();
CREATE OR REPLACE TRIGGER "update_clients_updated_at" BEFORE UPDATE ON "public"."clients" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();
CREATE OR REPLACE TRIGGER "update_clinic_subscriptions_updated_at" BEFORE UPDATE ON "public"."clinic_subscriptions" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();
CREATE OR REPLACE TRIGGER "update_clinics_updated_at" BEFORE UPDATE ON "public"."clinics" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();
CREATE OR REPLACE TRIGGER "update_daily_cash_summary_updated_at" BEFORE UPDATE ON "public"."daily_cash_summary" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();
CREATE OR REPLACE TRIGGER "update_expenses_updated_at" BEFORE UPDATE ON "public"."expenses" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();
CREATE OR REPLACE TRIGGER "update_payments_updated_at" BEFORE UPDATE ON "public"."payments" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();
CREATE OR REPLACE TRIGGER "update_profiles_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();
CREATE OR REPLACE TRIGGER "update_security_settings_updated_at_trigger" BEFORE UPDATE ON "public"."security_settings" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();
CREATE OR REPLACE TRIGGER "update_shifts_updated_at" BEFORE UPDATE ON "public"."shifts" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();
CREATE OR REPLACE TRIGGER "update_subscription_invoices_updated_at" BEFORE UPDATE ON "public"."subscription_invoices" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();
CREATE OR REPLACE TRIGGER "update_subscription_plans_updated_at" BEFORE UPDATE ON "public"."subscription_plans" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();
CREATE OR REPLACE TRIGGER "update_suppliers_updated_at" BEFORE UPDATE ON "public"."suppliers" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();
CREATE OR REPLACE TRIGGER "update_therapists_updated_at" BEFORE UPDATE ON "public"."therapists" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();
CREATE OR REPLACE TRIGGER "update_treatments_updated_at" BEFORE UPDATE ON "public"."treatments" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();
CREATE OR REPLACE TRIGGER "update_user_preferences_updated_at_trigger" BEFORE UPDATE ON "public"."user_preferences" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();
