--
-- PostgreSQL database dump
--

\restrict VMRvxbW783Vi22xMlx6acCQ8uKhze2S3h7bF5DEL1tNSMkCqLXYiBG9nYnZMIZs

-- Dumped from database version 16.13 (Ubuntu 16.13-0ubuntu0.24.04.1)
-- Dumped by pg_dump version 16.13 (Ubuntu 16.13-0ubuntu0.24.04.1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: badges; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.badges (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    badge_type character varying NOT NULL,
    awarded_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.badges OWNER TO postgres;

--
-- Name: contracts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.contracts (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    project_id uuid NOT NULL,
    milestone_id uuid,
    contract_type character varying NOT NULL,
    party1_id uuid NOT NULL,
    party2_id uuid NOT NULL,
    terms text NOT NULL,
    status character varying DEFAULT 'pending'::character varying NOT NULL,
    party1_accepted boolean DEFAULT false,
    party2_accepted boolean DEFAULT false,
    party1_accepted_at timestamp without time zone,
    party2_accepted_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    contract_number character varying(50),
    contract_date timestamp without time zone DEFAULT now(),
    pdf_url text,
    party1_signature text,
    party2_signature text,
    party1_signed_at timestamp without time zone,
    party2_signed_at timestamp without time zone,
    CONSTRAINT contracts_contract_type_check CHECK (((contract_type)::text = ANY ((ARRAY['project'::character varying, 'milestone'::character varying, 'final'::character varying])::text[]))),
    CONSTRAINT contracts_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'accepted'::character varying, 'rejected'::character varying, 'completed'::character varying])::text[])))
);


ALTER TABLE public.contracts OWNER TO postgres;

--
-- Name: direct_collaborations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.direct_collaborations (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    collaborator_id uuid NOT NULL,
    project_id uuid,
    collaboration_type character varying,
    started_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    ended_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT direct_collaborations_collaboration_type_check CHECK (((collaboration_type)::text = ANY ((ARRAY['expert_expert'::character varying, 'expert_company'::character varying, 'company_company'::character varying])::text[])))
);


ALTER TABLE public.direct_collaborations OWNER TO postgres;

--
-- Name: disputes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.disputes (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    project_id uuid NOT NULL,
    initiator_id uuid NOT NULL,
    reason text NOT NULL,
    status character varying DEFAULT 'open'::character varying,
    resolution text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT disputes_status_check CHECK (((status)::text = ANY ((ARRAY['open'::character varying, 'resolved'::character varying, 'closed'::character varying])::text[])))
);


ALTER TABLE public.disputes OWNER TO postgres;

--
-- Name: escrow_accounts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.escrow_accounts (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    project_id uuid NOT NULL,
    total_amount_ron numeric(10,2),
    claudiu_commission_percent numeric(5,2) DEFAULT 10,
    status character varying DEFAULT 'open'::character varying,
    held_balance_ron numeric(10,2) DEFAULT 0,
    released_to_expert_total_ron numeric(10,2) DEFAULT 0,
    claudiu_earned_total_ron numeric(10,2) DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    all_milestones_completed_at timestamp without time zone,
    CONSTRAINT escrow_accounts_status_check CHECK (((status)::text = ANY ((ARRAY['open'::character varying, 'held'::character varying, 'partially_released'::character varying, 'fully_released'::character varying])::text[])))
);


ALTER TABLE public.escrow_accounts OWNER TO postgres;

--
-- Name: master_contracts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.master_contracts (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    contract_version character varying DEFAULT '1.0'::character varying NOT NULL,
    accepted_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    ip_address character varying,
    user_agent text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.master_contracts OWNER TO postgres;

--
-- Name: messages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.messages (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    project_id uuid NOT NULL,
    sender_id uuid NOT NULL,
    recipient_id uuid,
    content text NOT NULL,
    file_url character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    read_at timestamp without time zone
);


ALTER TABLE public.messages OWNER TO postgres;

--
-- Name: milestone_disputes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.milestone_disputes (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    milestone_id uuid NOT NULL,
    raised_by uuid NOT NULL,
    reason text,
    claudiu_decision text,
    claudiu_release_amount_ron numeric(10,2),
    status character varying DEFAULT 'pending'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    resolved_at timestamp without time zone,
    CONSTRAINT milestone_disputes_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'resolved'::character varying])::text[])))
);


ALTER TABLE public.milestone_disputes OWNER TO postgres;

--
-- Name: milestone_releases; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.milestone_releases (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    escrow_id uuid NOT NULL,
    milestone_id uuid NOT NULL,
    release_amount_ron numeric(10,2),
    claudiu_commission_amount_ron numeric(10,2),
    expert_amount_ron numeric(10,2),
    released_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.milestone_releases OWNER TO postgres;

--
-- Name: milestone_signatures; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.milestone_signatures (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id uuid NOT NULL,
    milestone_id uuid NOT NULL,
    party1_approved boolean DEFAULT false,
    party2_approved boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    signed_by uuid,
    signed_at timestamp without time zone,
    signature text
);


ALTER TABLE public.milestone_signatures OWNER TO postgres;

--
-- Name: milestones; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.milestones (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    project_id uuid NOT NULL,
    order_number integer NOT NULL,
    title character varying NOT NULL,
    description text,
    deliverable_description text,
    percentage_of_budget numeric(5,2),
    amount_ron numeric(10,2),
    status character varying DEFAULT 'pending'::character varying,
    deliverable_file_url character varying,
    completed_at timestamp without time zone,
    party1_approved boolean DEFAULT false,
    party2_approved boolean DEFAULT false,
    party1_approved_at timestamp without time zone,
    party2_approved_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT now(),
    delivered_at timestamp without time zone,
    approved_at timestamp without time zone,
    CONSTRAINT milestones_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'in_progress'::character varying, 'delivered'::character varying, 'approved'::character varying, 'disputed'::character varying, 'released'::character varying])::text[])))
);


ALTER TABLE public.milestones OWNER TO postgres;

--
-- Name: notifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.notifications (
    id integer NOT NULL,
    user_id uuid NOT NULL,
    type character varying(50) NOT NULL,
    title character varying(255) NOT NULL,
    message text,
    is_read boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.notifications OWNER TO postgres;

--
-- Name: notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.notifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.notifications_id_seq OWNER TO postgres;

--
-- Name: notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.notifications_id_seq OWNED BY public.notifications.id;


--
-- Name: payments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.payments (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    milestone_id uuid NOT NULL,
    amount numeric(12,2) NOT NULL,
    status character varying DEFAULT 'pending'::character varying,
    stripe_payment_id character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT payments_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'completed'::character varying, 'failed'::character varying, 'refunded'::character varying])::text[])))
);


ALTER TABLE public.payments OWNER TO postgres;

--
-- Name: portfolio_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.portfolio_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    file_url text NOT NULL,
    file_type character varying(50) NOT NULL,
    media_type character varying(50) NOT NULL,
    file_size integer,
    thumbnail_url text,
    display_order integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    client_name character varying(255),
    project_year integer,
    results text,
    technologies text,
    category character varying(100),
    is_featured boolean DEFAULT false
);


ALTER TABLE public.portfolio_items OWNER TO postgres;

--
-- Name: project_modifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.project_modifications (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    project_id uuid NOT NULL,
    milestone_id uuid,
    modification_type character varying NOT NULL,
    field_name character varying,
    old_value text,
    new_value text,
    proposed_by uuid NOT NULL,
    party1_approved boolean DEFAULT false,
    party1_approved_at timestamp without time zone,
    party2_approved boolean DEFAULT false,
    party2_approved_at timestamp without time zone,
    status character varying DEFAULT 'pending'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    proposed_by_party1 boolean,
    CONSTRAINT project_modifications_modification_type_check CHECK (((modification_type)::text = ANY ((ARRAY['project'::character varying, 'milestone'::character varying, 'milestone_create'::character varying, 'milestone_delete'::character varying])::text[]))),
    CONSTRAINT project_modifications_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'approved'::character varying, 'rejected'::character varying])::text[])))
);


ALTER TABLE public.project_modifications OWNER TO postgres;

--
-- Name: projects; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.projects (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    client_id uuid NOT NULL,
    expert_id uuid,
    title character varying NOT NULL,
    description text,
    budget_ron numeric(10,2) NOT NULL,
    timeline_days integer,
    status character varying DEFAULT 'pending_admin_approval'::character varying,
    rejection_reason text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    deadline timestamp without time zone,
    completed_at timestamp without time zone,
    company_id uuid,
    task_id uuid,
    posted_by_expert uuid,
    posted_by_client uuid,
    expert_posting_status character varying DEFAULT 'pending'::character varying,
    client_posting_status character varying DEFAULT 'pending'::character varying,
    service_type character varying DEFAULT 'matching'::character varying,
    commission_percent numeric(5,2) DEFAULT 10,
    assignment_type character varying,
    client_posting_message text,
    expert_posting_message text,
    CONSTRAINT projects_status_check CHECK (((status)::text = ANY ((ARRAY['pending_admin_approval'::character varying, 'pending_assignment'::character varying, 'assigned'::character varying, 'open'::character varying, 'in_progress'::character varying, 'delivered'::character varying, 'completed'::character varying, 'disputed'::character varying, 'rejected'::character varying])::text[])))
);


ALTER TABLE public.projects OWNER TO postgres;

--
-- Name: referral_codes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.referral_codes (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    code character varying(20) NOT NULL,
    usage_count integer DEFAULT 0,
    max_uses integer DEFAULT 10,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    expires_at timestamp without time zone,
    trust_level_bonus integer
);


ALTER TABLE public.referral_codes OWNER TO postgres;

--
-- Name: referral_settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.referral_settings (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    key character varying(50) NOT NULL,
    value numeric(10,2) NOT NULL,
    description text,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.referral_settings OWNER TO postgres;

--
-- Name: referrals; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.referrals (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    referrer_id uuid NOT NULL,
    referred_id uuid NOT NULL,
    referral_code_id uuid,
    status character varying(20) DEFAULT 'pending'::character varying,
    referrer_trust_bonus numeric(5,2) DEFAULT 0,
    referred_trust_bonus numeric(5,2) DEFAULT 0,
    referral_date timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    verification_date timestamp without time zone,
    completed_date timestamp without time zone,
    CONSTRAINT referrals_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'registered'::character varying, 'verified'::character varying, 'completed'::character varying, 'cancelled'::character varying])::text[])))
);


ALTER TABLE public.referrals OWNER TO postgres;

--
-- Name: reviews; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.reviews (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    project_id uuid NOT NULL,
    reviewer_id uuid NOT NULL,
    reviewed_id uuid NOT NULL,
    rating integer,
    comment text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT reviews_rating_check CHECK (((rating >= 1) AND (rating <= 5)))
);


ALTER TABLE public.reviews OWNER TO postgres;

--
-- Name: task_requests; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.task_requests (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    project_id uuid NOT NULL,
    message text,
    status character varying DEFAULT 'pending'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT task_requests_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'approved'::character varying, 'rejected'::character varying, 'cancelled'::character varying])::text[])))
);


ALTER TABLE public.task_requests OWNER TO postgres;

--
-- Name: tasks; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tasks (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    client_id uuid NOT NULL,
    title character varying NOT NULL,
    description text,
    budget_ron numeric(12,2) NOT NULL,
    timeline_days integer,
    status character varying DEFAULT 'open'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    deadline timestamp without time zone,
    completed_at timestamp without time zone,
    CONSTRAINT tasks_status_check CHECK (((status)::text = ANY (ARRAY[('pending_admin_approval'::character varying)::text, ('open'::character varying)::text, ('in_progress'::character varying)::text, ('completed'::character varying)::text, ('cancelled'::character varying)::text])))
);


ALTER TABLE public.tasks OWNER TO postgres;

--
-- Name: TABLE tasks; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.tasks IS 'Parent entity for Project Management module - contains multiple assignments (projects)';


--
-- Name: COLUMN tasks.client_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.tasks.client_id IS 'Beneficiary who created the task';


--
-- Name: trust_profile_history; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.trust_profile_history (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    trust_profile_id uuid NOT NULL,
    trust_level integer,
    trust_score numeric(5,2),
    change_reason character varying NOT NULL,
    changed_by uuid,
    calculated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.trust_profile_history OWNER TO postgres;

--
-- Name: trust_profiles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.trust_profiles (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    profile_type character varying NOT NULL,
    trust_level integer,
    verified_identity boolean DEFAULT false,
    profile_completed boolean DEFAULT false,
    portfolio_completed boolean DEFAULT false,
    accepted_master_contract boolean DEFAULT false,
    recommended_by_user_id uuid,
    recommended_by_company_id uuid,
    has_direct_collaboration boolean DEFAULT false,
    is_known_directly_by_admin boolean DEFAULT false,
    collaboration_count integer DEFAULT 0,
    total_projects_completed integer DEFAULT 0,
    average_rating numeric(3,2) DEFAULT 0,
    total_reviews_count integer DEFAULT 0,
    trust_score numeric(5,2) DEFAULT 0,
    calculated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    verification_score integer DEFAULT 0,
    has_verification_call boolean DEFAULT false,
    verification_level integer DEFAULT 0,
    referral_code character varying(20),
    referred_by uuid,
    type1_points integer DEFAULT 0,
    manual_trust_override boolean DEFAULT false,
    override_reason text,
    kyc_verified boolean DEFAULT false,
    portfolio_submitted boolean DEFAULT false,
    portfolio_approved_by_admin boolean DEFAULT false,
    payment_method_added boolean DEFAULT false,
    type2_points integer DEFAULT 0,
    type3_points integer DEFAULT 0,
    profile_photo_added boolean DEFAULT false,
    email_validated boolean DEFAULT false,
    CONSTRAINT trust_profiles_profile_type_check CHECK (((profile_type)::text = ANY ((ARRAY['expert'::character varying, 'company'::character varying])::text[]))),
    CONSTRAINT trust_profiles_trust_level_check CHECK (((trust_level >= 1) AND (trust_level <= 5)))
);


ALTER TABLE public.trust_profiles OWNER TO postgres;

--
-- Name: user_contracts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_contracts (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid,
    contract_type character varying(50) DEFAULT 'terms_conditions'::character varying NOT NULL,
    contract_pdf_url text,
    signed_at timestamp without time zone DEFAULT now(),
    ip_address character varying(50),
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.user_contracts OWNER TO postgres;

--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    email character varying NOT NULL,
    password_hash character varying NOT NULL,
    name character varying NOT NULL,
    role character varying NOT NULL,
    company character varying,
    expertise text,
    bio text,
    kyc_status character varying DEFAULT 'pending'::character varying,
    kyc_documents jsonb,
    verification_date timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    phone character varying,
    profile_image_url text,
    portfolio_description text,
    industry character varying,
    experience character varying,
    cui character varying(20),
    completed_projects integer DEFAULT 0,
    CONSTRAINT users_kyc_status_check CHECK (((kyc_status)::text = ANY ((ARRAY['pending'::character varying, 'verified'::character varying, 'rejected'::character varying])::text[]))),
    CONSTRAINT users_role_check CHECK (((role)::text = ANY (ARRAY[('expert'::character varying)::text, ('client'::character varying)::text, ('admin'::character varying)::text, ('company'::character varying)::text])))
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: verification_calls; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.verification_calls (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    scheduled_date date NOT NULL,
    scheduled_time time without time zone NOT NULL,
    status character varying DEFAULT 'scheduled'::character varying,
    notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT verification_calls_status_check CHECK (((status)::text = ANY ((ARRAY['scheduled'::character varying, 'completed'::character varying, 'cancelled'::character varying])::text[])))
);


ALTER TABLE public.verification_calls OWNER TO postgres;

--
-- Name: notifications id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications ALTER COLUMN id SET DEFAULT nextval('public.notifications_id_seq'::regclass);


--
-- Name: badges badges_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.badges
    ADD CONSTRAINT badges_pkey PRIMARY KEY (id);


--
-- Name: contracts contracts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contracts
    ADD CONSTRAINT contracts_pkey PRIMARY KEY (id);


--
-- Name: direct_collaborations direct_collaborations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.direct_collaborations
    ADD CONSTRAINT direct_collaborations_pkey PRIMARY KEY (id);


--
-- Name: disputes disputes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.disputes
    ADD CONSTRAINT disputes_pkey PRIMARY KEY (id);


--
-- Name: escrow_accounts escrow_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.escrow_accounts
    ADD CONSTRAINT escrow_accounts_pkey PRIMARY KEY (id);


--
-- Name: master_contracts master_contracts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.master_contracts
    ADD CONSTRAINT master_contracts_pkey PRIMARY KEY (id);


--
-- Name: master_contracts master_contracts_user_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.master_contracts
    ADD CONSTRAINT master_contracts_user_id_key UNIQUE (user_id);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);


--
-- Name: milestone_disputes milestone_disputes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.milestone_disputes
    ADD CONSTRAINT milestone_disputes_pkey PRIMARY KEY (id);


--
-- Name: milestone_releases milestone_releases_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.milestone_releases
    ADD CONSTRAINT milestone_releases_pkey PRIMARY KEY (id);


--
-- Name: milestone_signatures milestone_signatures_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.milestone_signatures
    ADD CONSTRAINT milestone_signatures_pkey PRIMARY KEY (id);


--
-- Name: milestones milestones_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.milestones
    ADD CONSTRAINT milestones_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);


--
-- Name: portfolio_items portfolio_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.portfolio_items
    ADD CONSTRAINT portfolio_items_pkey PRIMARY KEY (id);


--
-- Name: project_modifications project_modifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_modifications
    ADD CONSTRAINT project_modifications_pkey PRIMARY KEY (id);


--
-- Name: projects projects_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_pkey PRIMARY KEY (id);


--
-- Name: referral_codes referral_codes_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.referral_codes
    ADD CONSTRAINT referral_codes_code_key UNIQUE (code);


--
-- Name: referral_codes referral_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.referral_codes
    ADD CONSTRAINT referral_codes_pkey PRIMARY KEY (id);


--
-- Name: referral_settings referral_settings_key_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.referral_settings
    ADD CONSTRAINT referral_settings_key_key UNIQUE (key);


--
-- Name: referral_settings referral_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.referral_settings
    ADD CONSTRAINT referral_settings_pkey PRIMARY KEY (id);


--
-- Name: referrals referrals_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.referrals
    ADD CONSTRAINT referrals_pkey PRIMARY KEY (id);


--
-- Name: reviews reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_pkey PRIMARY KEY (id);


--
-- Name: task_requests task_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.task_requests
    ADD CONSTRAINT task_requests_pkey PRIMARY KEY (id);


--
-- Name: tasks tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_pkey PRIMARY KEY (id);


--
-- Name: trust_profile_history trust_profile_history_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.trust_profile_history
    ADD CONSTRAINT trust_profile_history_pkey PRIMARY KEY (id);


--
-- Name: trust_profiles trust_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.trust_profiles
    ADD CONSTRAINT trust_profiles_pkey PRIMARY KEY (id);


--
-- Name: trust_profiles trust_profiles_user_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.trust_profiles
    ADD CONSTRAINT trust_profiles_user_id_key UNIQUE (user_id);


--
-- Name: referrals unique_referral; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.referrals
    ADD CONSTRAINT unique_referral UNIQUE (referrer_id, referred_id);


--
-- Name: direct_collaborations unique_user_collaboration; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.direct_collaborations
    ADD CONSTRAINT unique_user_collaboration UNIQUE (user_id, collaborator_id, project_id);


--
-- Name: user_contracts user_contracts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_contracts
    ADD CONSTRAINT user_contracts_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: verification_calls verification_calls_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.verification_calls
    ADD CONSTRAINT verification_calls_pkey PRIMARY KEY (id);


--
-- Name: idx_direct_collaborations_collaborator_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_direct_collaborations_collaborator_id ON public.direct_collaborations USING btree (collaborator_id);


--
-- Name: idx_direct_collaborations_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_direct_collaborations_user_id ON public.direct_collaborations USING btree (user_id);


--
-- Name: idx_escrow_project; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_escrow_project ON public.escrow_accounts USING btree (project_id);


--
-- Name: idx_master_contracts_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_master_contracts_user_id ON public.master_contracts USING btree (user_id);


--
-- Name: idx_messages_project; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_messages_project ON public.messages USING btree (project_id);


--
-- Name: idx_milestones_project; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_milestones_project ON public.milestones USING btree (project_id);


--
-- Name: idx_payments_milestone_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_payments_milestone_id ON public.payments USING btree (milestone_id);


--
-- Name: idx_portfolio_display_order; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_portfolio_display_order ON public.portfolio_items USING btree (user_id, display_order);


--
-- Name: idx_portfolio_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_portfolio_user_id ON public.portfolio_items USING btree (user_id);


--
-- Name: idx_project_modifications_project; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_project_modifications_project ON public.project_modifications USING btree (project_id);


--
-- Name: idx_projects_client; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_projects_client ON public.projects USING btree (client_id);


--
-- Name: idx_projects_company_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_projects_company_id ON public.projects USING btree (company_id);


--
-- Name: idx_projects_expert; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_projects_expert ON public.projects USING btree (expert_id);


--
-- Name: idx_projects_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_projects_status ON public.projects USING btree (status);


--
-- Name: idx_referral_codes_code; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_referral_codes_code ON public.referral_codes USING btree (code);


--
-- Name: idx_referral_codes_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_referral_codes_user_id ON public.referral_codes USING btree (user_id);


--
-- Name: idx_referrals_referred_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_referrals_referred_id ON public.referrals USING btree (referred_id);


--
-- Name: idx_referrals_referrer_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_referrals_referrer_id ON public.referrals USING btree (referrer_id);


--
-- Name: idx_referrals_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_referrals_status ON public.referrals USING btree (status);


--
-- Name: idx_task_requests_project_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_task_requests_project_id ON public.task_requests USING btree (project_id);


--
-- Name: idx_task_requests_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_task_requests_user_id ON public.task_requests USING btree (user_id);


--
-- Name: idx_tasks_client_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tasks_client_id ON public.tasks USING btree (client_id);


--
-- Name: idx_tasks_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tasks_status ON public.tasks USING btree (status);


--
-- Name: idx_trust_profile_history_calculated_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_trust_profile_history_calculated_at ON public.trust_profile_history USING btree (calculated_at);


--
-- Name: idx_trust_profile_history_profile_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_trust_profile_history_profile_id ON public.trust_profile_history USING btree (trust_profile_id);


--
-- Name: idx_trust_profiles_profile_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_trust_profiles_profile_type ON public.trust_profiles USING btree (profile_type);


--
-- Name: idx_trust_profiles_trust_level; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_trust_profiles_trust_level ON public.trust_profiles USING btree (trust_level);


--
-- Name: idx_trust_profiles_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_trust_profiles_user_id ON public.trust_profiles USING btree (user_id);


--
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_email ON public.users USING btree (email);


--
-- Name: idx_users_role; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_role ON public.users USING btree (role);


--
-- Name: idx_verification_calls_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_verification_calls_user_id ON public.verification_calls USING btree (user_id);


--
-- Name: badges badges_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.badges
    ADD CONSTRAINT badges_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: contracts contracts_milestone_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contracts
    ADD CONSTRAINT contracts_milestone_id_fkey FOREIGN KEY (milestone_id) REFERENCES public.milestones(id);


--
-- Name: contracts contracts_party1_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contracts
    ADD CONSTRAINT contracts_party1_id_fkey FOREIGN KEY (party1_id) REFERENCES public.users(id);


--
-- Name: contracts contracts_party2_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contracts
    ADD CONSTRAINT contracts_party2_id_fkey FOREIGN KEY (party2_id) REFERENCES public.users(id);


--
-- Name: contracts contracts_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contracts
    ADD CONSTRAINT contracts_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id);


--
-- Name: direct_collaborations direct_collaborations_collaborator_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.direct_collaborations
    ADD CONSTRAINT direct_collaborations_collaborator_id_fkey FOREIGN KEY (collaborator_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: direct_collaborations direct_collaborations_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.direct_collaborations
    ADD CONSTRAINT direct_collaborations_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE SET NULL;


--
-- Name: direct_collaborations direct_collaborations_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.direct_collaborations
    ADD CONSTRAINT direct_collaborations_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: disputes disputes_initiator_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.disputes
    ADD CONSTRAINT disputes_initiator_id_fkey FOREIGN KEY (initiator_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: escrow_accounts escrow_accounts_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.escrow_accounts
    ADD CONSTRAINT escrow_accounts_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id);


--
-- Name: trust_profiles fk_recommended_by_company; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.trust_profiles
    ADD CONSTRAINT fk_recommended_by_company FOREIGN KEY (recommended_by_company_id) REFERENCES public.users(id);


--
-- Name: trust_profiles fk_recommended_by_user; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.trust_profiles
    ADD CONSTRAINT fk_recommended_by_user FOREIGN KEY (recommended_by_user_id) REFERENCES public.users(id);


--
-- Name: master_contracts master_contracts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.master_contracts
    ADD CONSTRAINT master_contracts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: messages messages_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id);


--
-- Name: messages messages_recipient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_recipient_id_fkey FOREIGN KEY (recipient_id) REFERENCES public.users(id);


--
-- Name: messages messages_sender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.users(id);


--
-- Name: milestone_disputes milestone_disputes_milestone_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.milestone_disputes
    ADD CONSTRAINT milestone_disputes_milestone_id_fkey FOREIGN KEY (milestone_id) REFERENCES public.milestones(id);


--
-- Name: milestone_disputes milestone_disputes_raised_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.milestone_disputes
    ADD CONSTRAINT milestone_disputes_raised_by_fkey FOREIGN KEY (raised_by) REFERENCES public.users(id);


--
-- Name: milestone_releases milestone_releases_escrow_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.milestone_releases
    ADD CONSTRAINT milestone_releases_escrow_id_fkey FOREIGN KEY (escrow_id) REFERENCES public.escrow_accounts(id);


--
-- Name: milestone_releases milestone_releases_milestone_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.milestone_releases
    ADD CONSTRAINT milestone_releases_milestone_id_fkey FOREIGN KEY (milestone_id) REFERENCES public.milestones(id);


--
-- Name: milestones milestones_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.milestones
    ADD CONSTRAINT milestones_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id);


--
-- Name: portfolio_items portfolio_items_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.portfolio_items
    ADD CONSTRAINT portfolio_items_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: project_modifications project_modifications_proposed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_modifications
    ADD CONSTRAINT project_modifications_proposed_by_fkey FOREIGN KEY (proposed_by) REFERENCES public.users(id);


--
-- Name: projects projects_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.users(id);


--
-- Name: projects projects_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: projects projects_expert_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_expert_id_fkey FOREIGN KEY (expert_id) REFERENCES public.users(id);


--
-- Name: projects projects_posted_by_client_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_posted_by_client_fkey FOREIGN KEY (posted_by_client) REFERENCES public.users(id);


--
-- Name: projects projects_posted_by_expert_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_posted_by_expert_fkey FOREIGN KEY (posted_by_expert) REFERENCES public.users(id);


--
-- Name: referral_codes referral_codes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.referral_codes
    ADD CONSTRAINT referral_codes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: referrals referrals_referral_code_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.referrals
    ADD CONSTRAINT referrals_referral_code_id_fkey FOREIGN KEY (referral_code_id) REFERENCES public.referral_codes(id) ON DELETE SET NULL;


--
-- Name: referrals referrals_referred_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.referrals
    ADD CONSTRAINT referrals_referred_id_fkey FOREIGN KEY (referred_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: referrals referrals_referrer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.referrals
    ADD CONSTRAINT referrals_referrer_id_fkey FOREIGN KEY (referrer_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: reviews reviews_reviewed_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_reviewed_id_fkey FOREIGN KEY (reviewed_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: reviews reviews_reviewer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_reviewer_id_fkey FOREIGN KEY (reviewer_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: task_requests task_requests_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.task_requests
    ADD CONSTRAINT task_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: tasks tasks_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: trust_profile_history trust_profile_history_changed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.trust_profile_history
    ADD CONSTRAINT trust_profile_history_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: trust_profile_history trust_profile_history_trust_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.trust_profile_history
    ADD CONSTRAINT trust_profile_history_trust_profile_id_fkey FOREIGN KEY (trust_profile_id) REFERENCES public.trust_profiles(id) ON DELETE CASCADE;


--
-- Name: trust_profiles trust_profiles_recommended_by_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.trust_profiles
    ADD CONSTRAINT trust_profiles_recommended_by_company_id_fkey FOREIGN KEY (recommended_by_company_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: trust_profiles trust_profiles_recommended_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.trust_profiles
    ADD CONSTRAINT trust_profiles_recommended_by_user_id_fkey FOREIGN KEY (recommended_by_user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: trust_profiles trust_profiles_referred_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.trust_profiles
    ADD CONSTRAINT trust_profiles_referred_by_fkey FOREIGN KEY (referred_by) REFERENCES public.users(id);


--
-- Name: trust_profiles trust_profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.trust_profiles
    ADD CONSTRAINT trust_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_contracts user_contracts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_contracts
    ADD CONSTRAINT user_contracts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: verification_calls verification_calls_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.verification_calls
    ADD CONSTRAINT verification_calls_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict VMRvxbW783Vi22xMlx6acCQ8uKhze2S3h7bF5DEL1tNSMkCqLXYiBG9nYnZMIZs

