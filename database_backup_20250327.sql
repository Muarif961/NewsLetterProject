--
-- PostgreSQL database dump
--

-- Dumped from database version 16.8
-- Dumped by pg_dump version 16.5

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
-- Name: auth_diagnostics(); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

CREATE FUNCTION public.auth_diagnostics() RETURNS json
    LANGUAGE plpgsql
    AS $$
DECLARE
    result JSON;
BEGIN
    WITH password_stats AS (
        SELECT 
            COUNT(*) as total_users,
            SUM(CASE WHEN password IS NULL THEN 1 ELSE 0 END) as missing_passwords,
            SUM(CASE WHEN password = '' THEN 1 ELSE 0 END) as empty_passwords,
            SUM(CASE WHEN LENGTH(password) = 161 THEN 1 ELSE 0 END) as valid_passwords,
            SUM(CASE WHEN LENGTH(password) != 161 AND password IS NOT NULL AND password != '' THEN 1 ELSE 0 END) as invalid_passwords
        FROM users
    ),
    subscription_stats AS (
        SELECT 
            COUNT(*) as total_subscriptions,
            COUNT(DISTINCT user_id) as users_with_subscriptions,
            COUNT(DISTINCT CASE WHEN provider = 'stripe' THEN user_id END) as stripe_users,
            COUNT(DISTINCT CASE WHEN provider = 'appsumo' THEN user_id END) as appsumo_users
        FROM user_subscriptions
    ),
    problematic_users AS (
        SELECT 
            id, 
            username, 
            email, 
            LENGTH(password) as password_length,
            CASE 
                WHEN password IS NULL THEN 'missing'
                WHEN password = '' THEN 'empty'
                WHEN LENGTH(password) != 161 THEN 'invalid_length'
                ELSE 'valid'
            END as password_status
        FROM users
        WHERE password IS NULL 
            OR password = '' 
            OR LENGTH(password) != 161
        ORDER BY id
        LIMIT 10
    )
    SELECT json_build_object(
        'password_statistics', (SELECT row_to_json(password_stats) FROM password_stats),
        'subscription_statistics', (SELECT row_to_json(subscription_stats) FROM subscription_stats),
        'problematic_users', (SELECT json_agg(row_to_json(problematic_users)) FROM problematic_users)
    ) INTO result;
    
    RETURN result;
END;
$$;


ALTER FUNCTION public.auth_diagnostics() OWNER TO neondb_owner;

--
-- Name: diagnose_user_password(integer); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

CREATE FUNCTION public.diagnose_user_password(user_id integer) RETURNS TABLE(id integer, username text, email text, password_length integer, password_status text)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id, 
        u.username, 
        u.email, 
        LENGTH(u.password) as password_length,
        CASE 
            WHEN u.password IS NULL THEN 'missing'
            WHEN u.password = '' THEN 'empty'
            WHEN LENGTH(u.password) = 161 THEN 'valid'
            ELSE 'invalid_length'
        END as password_status
    FROM users u
    WHERE u.id = user_id;
END;
$$;


ALTER FUNCTION public.diagnose_user_password(user_id integer) OWNER TO neondb_owner;

--
-- Name: fix_user_password(integer, text); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

CREATE FUNCTION public.fix_user_password(p_user_id integer, p_new_password text) RETURNS json
    LANGUAGE plpgsql
    AS $$
DECLARE
    hashed_password TEXT;
    result JSON;
BEGIN
    -- Check if user exists
    IF NOT EXISTS (SELECT 1 FROM users WHERE id = p_user_id) THEN
        RETURN json_build_object(
            'success', false,
            'message', 'User not found'
        );
    END IF;
    
    -- Create a properly formatted 161-character password hash
    -- This is just a simulated hash for demonstration - in reality we'd use the Node.js crypto module
    hashed_password := encode(digest(p_new_password || 'salt', 'sha512'), 'hex');
    
    -- Update the user's password
    UPDATE users 
    SET password = hashed_password,
        updated_at = NOW()
    WHERE id = p_user_id;
    
    -- Return diagnostic information
    WITH user_data AS (
        SELECT 
            id, 
            username, 
            email, 
            LENGTH(password) as password_length,
            CASE 
                WHEN password IS NULL THEN 'missing'
                WHEN password = '' THEN 'empty'
                WHEN LENGTH(password) = 161 THEN 'valid'
                ELSE 'invalid_length'
            END as password_status
        FROM users
        WHERE id = p_user_id
    )
    SELECT json_build_object(
        'success', true,
        'message', 'Password updated',
        'user', (SELECT row_to_json(user_data) FROM user_data),
        'fixed', (SELECT password_length = 161 FROM user_data)
    ) INTO result;
    
    RETURN result;
END;
$$;


ALTER FUNCTION public.fix_user_password(p_user_id integer, p_new_password text) OWNER TO neondb_owner;

--
-- Name: test_create_user(text, text, text, text); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

CREATE FUNCTION public.test_create_user(p_username text, p_email text, p_full_name text, p_password text) RETURNS TABLE(id integer, username text, email text, has_password boolean)
    LANGUAGE plpgsql
    AS $$
BEGIN
  -- Insert the user with explicit field names
  RETURN QUERY
  WITH inserted_user AS (
    INSERT INTO users (
      username, 
      email, 
      full_name, 
      password, 
      created_at, 
      updated_at
    ) 
    VALUES (
      p_username, 
      p_email, 
      p_full_name, 
      p_password,
      NOW(),
      NOW()
    )
    RETURNING id, username, email, password
  )
  SELECT 
    id, 
    username, 
    email, 
    password IS NOT NULL AND password != '' AS has_password
  FROM inserted_user;
END;
$$;


ALTER FUNCTION public.test_create_user(p_username text, p_email text, p_full_name text, p_password text) OWNER TO neondb_owner;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: api_keys; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.api_keys (
    id integer NOT NULL,
    user_id integer NOT NULL,
    openai_key text,
    news_api_key text,
    use_custom_openai boolean DEFAULT false NOT NULL,
    use_custom_news_api boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.api_keys OWNER TO neondb_owner;

--
-- Name: api_keys_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.api_keys_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.api_keys_id_seq OWNER TO neondb_owner;

--
-- Name: api_keys_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.api_keys_id_seq OWNED BY public.api_keys.id;


--
-- Name: appsumo_codes; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.appsumo_codes (
    id integer NOT NULL,
    code text NOT NULL,
    is_redeemed boolean DEFAULT false NOT NULL,
    redeemed_at timestamp with time zone,
    redeemed_by integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.appsumo_codes OWNER TO neondb_owner;

--
-- Name: appsumo_codes_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.appsumo_codes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.appsumo_codes_id_seq OWNER TO neondb_owner;

--
-- Name: appsumo_codes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.appsumo_codes_id_seq OWNED BY public.appsumo_codes.id;


--
-- Name: bounce_history; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.bounce_history (
    id integer NOT NULL,
    subscriber_id integer NOT NULL,
    newsletter_id integer NOT NULL,
    bounce_type character varying(50) NOT NULL,
    bounce_category character varying(50),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.bounce_history OWNER TO neondb_owner;

--
-- Name: bounce_history_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.bounce_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.bounce_history_id_seq OWNER TO neondb_owner;

--
-- Name: bounce_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.bounce_history_id_seq OWNED BY public.bounce_history.id;


--
-- Name: credit_purchases; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.credit_purchases (
    id integer NOT NULL,
    user_id integer NOT NULL,
    package_id text NOT NULL,
    credits_amount integer NOT NULL,
    price_paid integer NOT NULL,
    currency text NOT NULL,
    stripe_session_id text NOT NULL,
    stripe_payment_intent_id text,
    status text DEFAULT 'pending'::text NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    completed_at timestamp with time zone
);


ALTER TABLE public.credit_purchases OWNER TO neondb_owner;

--
-- Name: credit_purchases_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.credit_purchases_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.credit_purchases_id_seq OWNER TO neondb_owner;

--
-- Name: credit_purchases_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.credit_purchases_id_seq OWNED BY public.credit_purchases.id;


--
-- Name: credit_transactions; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.credit_transactions (
    id integer NOT NULL,
    user_id integer NOT NULL,
    amount integer NOT NULL,
    credits_before integer NOT NULL,
    credits_after integer NOT NULL,
    type text NOT NULL,
    action text NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.credit_transactions OWNER TO neondb_owner;

--
-- Name: credit_transactions_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.credit_transactions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.credit_transactions_id_seq OWNER TO neondb_owner;

--
-- Name: credit_transactions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.credit_transactions_id_seq OWNED BY public.credit_transactions.id;


--
-- Name: email_bounces; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.email_bounces (
    id integer NOT NULL,
    newsletter_id integer NOT NULL,
    email character varying(255) NOT NULL,
    bounce_type character varying(50) NOT NULL,
    bounce_category character varying(50),
    diagnostic_code text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.email_bounces OWNER TO neondb_owner;

--
-- Name: email_bounces_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.email_bounces_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.email_bounces_id_seq OWNER TO neondb_owner;

--
-- Name: email_bounces_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.email_bounces_id_seq OWNED BY public.email_bounces.id;


--
-- Name: email_events; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.email_events (
    id integer NOT NULL,
    newsletter_id integer,
    email text NOT NULL,
    event_type text NOT NULL,
    occurred_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    metadata jsonb DEFAULT '{}'::jsonb
);


ALTER TABLE public.email_events OWNER TO neondb_owner;

--
-- Name: email_events_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.email_events_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.email_events_id_seq OWNER TO neondb_owner;

--
-- Name: email_events_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.email_events_id_seq OWNED BY public.email_events.id;


--
-- Name: email_retries; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.email_retries (
    id integer NOT NULL,
    newsletter_id integer,
    recipient_email text NOT NULL,
    attempt_count integer DEFAULT 0,
    last_error text,
    last_attempt_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    next_attempt_at timestamp with time zone,
    status text DEFAULT 'pending'::text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT email_retries_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'success'::text, 'failed'::text])))
);


ALTER TABLE public.email_retries OWNER TO neondb_owner;

--
-- Name: email_retries_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.email_retries_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.email_retries_id_seq OWNER TO neondb_owner;

--
-- Name: email_retries_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.email_retries_id_seq OWNED BY public.email_retries.id;


--
-- Name: email_tracking; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.email_tracking (
    id integer NOT NULL,
    newsletter_id integer NOT NULL,
    recipient_email character varying(255) NOT NULL,
    event_type character varying(50) NOT NULL,
    event_timestamp timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    user_agent text,
    ip_address character varying(45),
    link_url text
);


ALTER TABLE public.email_tracking OWNER TO neondb_owner;

--
-- Name: email_tracking_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.email_tracking_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.email_tracking_id_seq OWNER TO neondb_owner;

--
-- Name: email_tracking_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.email_tracking_id_seq OWNED BY public.email_tracking.id;


--
-- Name: form_styles; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.form_styles (
    id integer NOT NULL,
    user_id integer NOT NULL,
    styles jsonb DEFAULT '{}'::jsonb NOT NULL,
    content jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.form_styles OWNER TO neondb_owner;

--
-- Name: form_styles_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.form_styles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.form_styles_id_seq OWNER TO neondb_owner;

--
-- Name: form_styles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.form_styles_id_seq OWNED BY public.form_styles.id;


--
-- Name: gmail_oauth_settings; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.gmail_oauth_settings (
    id integer NOT NULL,
    user_id integer NOT NULL,
    email text NOT NULL,
    access_token text NOT NULL,
    refresh_token text NOT NULL,
    token_expiry timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.gmail_oauth_settings OWNER TO neondb_owner;

--
-- Name: gmail_oauth_settings_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.gmail_oauth_settings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.gmail_oauth_settings_id_seq OWNER TO neondb_owner;

--
-- Name: gmail_oauth_settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.gmail_oauth_settings_id_seq OWNED BY public.gmail_oauth_settings.id;


--
-- Name: gmail_settings; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.gmail_settings (
    id integer NOT NULL,
    user_id integer NOT NULL,
    access_token text,
    refresh_token text,
    token_expiry timestamp with time zone,
    gmail_email text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.gmail_settings OWNER TO neondb_owner;

--
-- Name: gmail_settings_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.gmail_settings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.gmail_settings_id_seq OWNER TO neondb_owner;

--
-- Name: gmail_settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.gmail_settings_id_seq OWNED BY public.gmail_settings.id;


--
-- Name: google_oauth_settings; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.google_oauth_settings (
    id integer NOT NULL,
    user_id integer NOT NULL,
    access_token text NOT NULL,
    refresh_token text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    email text NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.google_oauth_settings OWNER TO neondb_owner;

--
-- Name: google_oauth_settings_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.google_oauth_settings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.google_oauth_settings_id_seq OWNER TO neondb_owner;

--
-- Name: google_oauth_settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.google_oauth_settings_id_seq OWNED BY public.google_oauth_settings.id;


--
-- Name: link_clicks; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.link_clicks (
    id integer NOT NULL,
    newsletter_id integer,
    url text NOT NULL,
    click_count integer DEFAULT 0,
    unique_visitors integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.link_clicks OWNER TO neondb_owner;

--
-- Name: link_clicks_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.link_clicks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.link_clicks_id_seq OWNER TO neondb_owner;

--
-- Name: link_clicks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.link_clicks_id_seq OWNED BY public.link_clicks.id;


--
-- Name: newsletter_analytics; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.newsletter_analytics (
    id integer NOT NULL,
    newsletter_id integer,
    total_recipients integer DEFAULT 0,
    total_opens integer DEFAULT 0,
    unique_opens integer DEFAULT 0,
    total_clicks integer DEFAULT 0,
    unique_clicks integer DEFAULT 0,
    bounce_count integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    event_type text DEFAULT 'open'::text NOT NULL,
    recipient_email text,
    user_agent text,
    ip_address text,
    metadata jsonb DEFAULT '{}'::jsonb,
    browser text,
    device text,
    country text,
    city text,
    email_client text,
    engagement_time_seconds integer,
    ab_test_variant text,
    click_position jsonb
);


ALTER TABLE public.newsletter_analytics OWNER TO neondb_owner;

--
-- Name: newsletter_analytics_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.newsletter_analytics_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.newsletter_analytics_id_seq OWNER TO neondb_owner;

--
-- Name: newsletter_analytics_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.newsletter_analytics_id_seq OWNED BY public.newsletter_analytics.id;


--
-- Name: newsletter_clicks; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.newsletter_clicks (
    id integer NOT NULL,
    newsletter_id integer NOT NULL,
    subscriber_email text NOT NULL,
    clicked_url text NOT NULL,
    clicked_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    user_agent text,
    ip_address text
);


ALTER TABLE public.newsletter_clicks OWNER TO neondb_owner;

--
-- Name: newsletter_clicks_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.newsletter_clicks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.newsletter_clicks_id_seq OWNER TO neondb_owner;

--
-- Name: newsletter_clicks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.newsletter_clicks_id_seq OWNED BY public.newsletter_clicks.id;


--
-- Name: newsletter_metrics; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.newsletter_metrics (
    id integer NOT NULL,
    newsletter_id integer NOT NULL,
    total_opens integer DEFAULT 0,
    unique_opens integer DEFAULT 0,
    total_clicks integer DEFAULT 0,
    unique_clicks integer DEFAULT 0,
    last_updated timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.newsletter_metrics OWNER TO neondb_owner;

--
-- Name: newsletter_metrics_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.newsletter_metrics_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.newsletter_metrics_id_seq OWNER TO neondb_owner;

--
-- Name: newsletter_metrics_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.newsletter_metrics_id_seq OWNED BY public.newsletter_metrics.id;


--
-- Name: newsletter_opens; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.newsletter_opens (
    id integer NOT NULL,
    newsletter_id integer NOT NULL,
    subscriber_email text NOT NULL,
    opened_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    user_agent text,
    ip_address text
);


ALTER TABLE public.newsletter_opens OWNER TO neondb_owner;

--
-- Name: newsletter_opens_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.newsletter_opens_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.newsletter_opens_id_seq OWNER TO neondb_owner;

--
-- Name: newsletter_opens_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.newsletter_opens_id_seq OWNED BY public.newsletter_opens.id;


--
-- Name: newsletter_templates; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.newsletter_templates (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    content text NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    is_default boolean DEFAULT false,
    category character varying(50),
    metadata jsonb DEFAULT '{}'::jsonb
);


ALTER TABLE public.newsletter_templates OWNER TO neondb_owner;

--
-- Name: newsletter_templates_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.newsletter_templates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.newsletter_templates_id_seq OWNER TO neondb_owner;

--
-- Name: newsletter_templates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.newsletter_templates_id_seq OWNED BY public.newsletter_templates.id;


--
-- Name: newsletters; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.newsletters (
    id integer NOT NULL,
    user_id integer NOT NULL,
    title text NOT NULL,
    content jsonb NOT NULL,
    template_id integer,
    status text DEFAULT 'draft'::text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    scheduled_at timestamp with time zone,
    schedule_status text DEFAULT 'pending'::text,
    scheduled_for timestamp with time zone,
    CONSTRAINT newsletters_schedule_status_check CHECK ((schedule_status = ANY (ARRAY['pending'::text, 'sent'::text, 'failed'::text, 'cancelled'::text]))),
    CONSTRAINT newsletters_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'scheduled'::text, 'sent'::text, 'failed'::text])))
);


ALTER TABLE public.newsletters OWNER TO neondb_owner;

--
-- Name: newsletters_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

ALTER TABLE public.newsletters ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.newsletters_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.notifications (
    id integer NOT NULL,
    user_id integer NOT NULL,
    type text NOT NULL,
    message text NOT NULL,
    detail text,
    read boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.notifications OWNER TO neondb_owner;

--
-- Name: notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

ALTER TABLE public.notifications ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.notifications_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: scheduled_emails; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.scheduled_emails (
    id integer NOT NULL,
    user_id integer NOT NULL,
    subject text NOT NULL,
    html_content text NOT NULL,
    recipients text[] NOT NULL,
    scheduled_time timestamp with time zone NOT NULL,
    status text DEFAULT 'pending'::text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    metadata jsonb,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.scheduled_emails OWNER TO neondb_owner;

--
-- Name: scheduled_emails_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.scheduled_emails_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.scheduled_emails_id_seq OWNER TO neondb_owner;

--
-- Name: scheduled_emails_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.scheduled_emails_id_seq OWNED BY public.scheduled_emails.id;


--
-- Name: scheduled_newsletters; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.scheduled_newsletters (
    id integer NOT NULL,
    user_id integer NOT NULL,
    subject text NOT NULL,
    content text NOT NULL,
    scheduled_time timestamp with time zone NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.scheduled_newsletters OWNER TO neondb_owner;

--
-- Name: scheduled_newsletters_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.scheduled_newsletters_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.scheduled_newsletters_id_seq OWNER TO neondb_owner;

--
-- Name: scheduled_newsletters_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.scheduled_newsletters_id_seq OWNED BY public.scheduled_newsletters.id;


--
-- Name: sent_newsletters; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.sent_newsletters (
    id integer NOT NULL,
    newsletter_id integer NOT NULL,
    sent_at timestamp without time zone DEFAULT now() NOT NULL,
    recipient_count integer NOT NULL
);


ALTER TABLE public.sent_newsletters OWNER TO neondb_owner;

--
-- Name: sent_newsletters_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

ALTER TABLE public.sent_newsletters ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.sent_newsletters_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: subscriber_group_members; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.subscriber_group_members (
    id integer NOT NULL,
    subscriber_id integer NOT NULL,
    group_id integer NOT NULL,
    added_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.subscriber_group_members OWNER TO neondb_owner;

--
-- Name: subscriber_group_members_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

ALTER TABLE public.subscriber_group_members ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.subscriber_group_members_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: subscriber_groups; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.subscriber_groups (
    id integer NOT NULL,
    user_id integer NOT NULL,
    name text NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.subscriber_groups OWNER TO neondb_owner;

--
-- Name: subscriber_groups_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

ALTER TABLE public.subscriber_groups ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.subscriber_groups_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: subscriber_tags; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.subscriber_tags (
    subscriber_id integer NOT NULL,
    tag_id integer NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.subscriber_tags OWNER TO neondb_owner;

--
-- Name: subscribers; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.subscribers (
    id integer NOT NULL,
    user_id integer NOT NULL,
    email text NOT NULL,
    name text,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    tags text[] DEFAULT '{}'::text[]
);


ALTER TABLE public.subscribers OWNER TO neondb_owner;

--
-- Name: subscribers_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.subscribers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.subscribers_id_seq OWNER TO neondb_owner;

--
-- Name: subscribers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.subscribers_id_seq OWNED BY public.subscribers.id;


--
-- Name: tags; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.tags (
    id integer NOT NULL,
    user_id integer NOT NULL,
    name text NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.tags OWNER TO neondb_owner;

--
-- Name: tags_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.tags_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.tags_id_seq OWNER TO neondb_owner;

--
-- Name: tags_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.tags_id_seq OWNED BY public.tags.id;


--
-- Name: template_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.template_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.template_id_seq OWNER TO neondb_owner;

--
-- Name: templates; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.templates (
    name text NOT NULL,
    description text,
    html text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    blocks jsonb DEFAULT '[]'::jsonb,
    structure jsonb DEFAULT '{}'::jsonb,
    user_id integer NOT NULL,
    preview text,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    id integer NOT NULL
);


ALTER TABLE public.templates OWNER TO neondb_owner;

--
-- Name: user_credits; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.user_credits (
    id integer NOT NULL,
    user_id integer NOT NULL,
    total_credits_allocated integer NOT NULL,
    credits_remaining integer NOT NULL,
    last_updated timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT positive_credits CHECK ((credits_remaining >= 0))
);


ALTER TABLE public.user_credits OWNER TO neondb_owner;

--
-- Name: user_credits_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.user_credits_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_credits_id_seq OWNER TO neondb_owner;

--
-- Name: user_credits_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.user_credits_id_seq OWNED BY public.user_credits.id;


--
-- Name: user_subscriptions; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.user_subscriptions (
    id integer NOT NULL,
    user_id integer NOT NULL,
    tier text NOT NULL,
    total_codes_redeemed integer DEFAULT 0 NOT NULL,
    activated_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    provider text DEFAULT 'appsumo'::text NOT NULL,
    metadata jsonb,
    initial_ai_credits integer NOT NULL,
    subscriber_limit integer NOT NULL,
    stripe_customer_id text,
    stripe_subscription_id text,
    stripe_payment_method_id text
);


ALTER TABLE public.user_subscriptions OWNER TO neondb_owner;

--
-- Name: users; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.users (
    id integer NOT NULL,
    username text NOT NULL,
    password text,
    clerk_user_id text,
    oauth_provider text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    full_name text NOT NULL,
    email text NOT NULL,
    image_url text,
    avatarurl text,
    fullname text,
    updatedat timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    avatar_url text,
    reset_password_token text,
    reset_password_expires timestamp with time zone
);


ALTER TABLE public.users OWNER TO neondb_owner;

--
-- Name: user_debug_view; Type: VIEW; Schema: public; Owner: neondb_owner
--

CREATE VIEW public.user_debug_view AS
 SELECT u.id,
    u.username,
    u.email,
    u.full_name,
        CASE
            WHEN ((u.password IS NOT NULL) AND (length(u.password) > 0)) THEN true
            ELSE false
        END AS has_password,
    length(u.password) AS password_length,
    us.tier AS subscription_tier,
    us.status AS subscription_status,
    us.provider AS subscription_provider,
    us.activated_at AS subscription_activated_at
   FROM (public.users u
     LEFT JOIN public.user_subscriptions us ON ((u.id = us.user_id)))
  ORDER BY u.id DESC
 LIMIT 10;


ALTER VIEW public.user_debug_view OWNER TO neondb_owner;

--
-- Name: user_feedback; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.user_feedback (
    id integer NOT NULL,
    user_id integer,
    feedback_type text,
    message text NOT NULL,
    rating integer,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    status text DEFAULT 'pending'::text,
    category text
);


ALTER TABLE public.user_feedback OWNER TO neondb_owner;

--
-- Name: user_feedback_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.user_feedback_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_feedback_id_seq OWNER TO neondb_owner;

--
-- Name: user_feedback_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.user_feedback_id_seq OWNED BY public.user_feedback.id;


--
-- Name: user_redeemed_codes; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.user_redeemed_codes (
    id integer NOT NULL,
    user_id integer NOT NULL,
    code_id integer NOT NULL,
    redeemed_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.user_redeemed_codes OWNER TO neondb_owner;

--
-- Name: user_redeemed_codes_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.user_redeemed_codes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_redeemed_codes_id_seq OWNER TO neondb_owner;

--
-- Name: user_redeemed_codes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.user_redeemed_codes_id_seq OWNED BY public.user_redeemed_codes.id;


--
-- Name: user_subscriptions_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.user_subscriptions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_subscriptions_id_seq OWNER TO neondb_owner;

--
-- Name: user_subscriptions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.user_subscriptions_id_seq OWNED BY public.user_subscriptions.id;


--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

ALTER TABLE public.users ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.users_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: verified_emails; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.verified_emails (
    id integer NOT NULL,
    user_id integer NOT NULL,
    email text NOT NULL,
    verification_token text NOT NULL,
    verification_status text DEFAULT 'pending'::text NOT NULL,
    is_domain boolean DEFAULT false NOT NULL,
    dns_records jsonb,
    verified_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT verified_emails_status_check CHECK ((verification_status = ANY (ARRAY['pending'::text, 'verified'::text, 'failed'::text])))
);


ALTER TABLE public.verified_emails OWNER TO neondb_owner;

--
-- Name: verified_emails_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.verified_emails_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.verified_emails_id_seq OWNER TO neondb_owner;

--
-- Name: verified_emails_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.verified_emails_id_seq OWNED BY public.verified_emails.id;


--
-- Name: api_keys id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.api_keys ALTER COLUMN id SET DEFAULT nextval('public.api_keys_id_seq'::regclass);


--
-- Name: appsumo_codes id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.appsumo_codes ALTER COLUMN id SET DEFAULT nextval('public.appsumo_codes_id_seq'::regclass);


--
-- Name: bounce_history id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.bounce_history ALTER COLUMN id SET DEFAULT nextval('public.bounce_history_id_seq'::regclass);


--
-- Name: credit_purchases id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.credit_purchases ALTER COLUMN id SET DEFAULT nextval('public.credit_purchases_id_seq'::regclass);


--
-- Name: credit_transactions id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.credit_transactions ALTER COLUMN id SET DEFAULT nextval('public.credit_transactions_id_seq'::regclass);


--
-- Name: email_bounces id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.email_bounces ALTER COLUMN id SET DEFAULT nextval('public.email_bounces_id_seq'::regclass);


--
-- Name: email_events id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.email_events ALTER COLUMN id SET DEFAULT nextval('public.email_events_id_seq'::regclass);


--
-- Name: email_retries id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.email_retries ALTER COLUMN id SET DEFAULT nextval('public.email_retries_id_seq'::regclass);


--
-- Name: email_tracking id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.email_tracking ALTER COLUMN id SET DEFAULT nextval('public.email_tracking_id_seq'::regclass);


--
-- Name: form_styles id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.form_styles ALTER COLUMN id SET DEFAULT nextval('public.form_styles_id_seq'::regclass);


--
-- Name: gmail_oauth_settings id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.gmail_oauth_settings ALTER COLUMN id SET DEFAULT nextval('public.gmail_oauth_settings_id_seq'::regclass);


--
-- Name: gmail_settings id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.gmail_settings ALTER COLUMN id SET DEFAULT nextval('public.gmail_settings_id_seq'::regclass);


--
-- Name: google_oauth_settings id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.google_oauth_settings ALTER COLUMN id SET DEFAULT nextval('public.google_oauth_settings_id_seq'::regclass);


--
-- Name: link_clicks id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.link_clicks ALTER COLUMN id SET DEFAULT nextval('public.link_clicks_id_seq'::regclass);


--
-- Name: newsletter_analytics id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.newsletter_analytics ALTER COLUMN id SET DEFAULT nextval('public.newsletter_analytics_id_seq'::regclass);


--
-- Name: newsletter_clicks id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.newsletter_clicks ALTER COLUMN id SET DEFAULT nextval('public.newsletter_clicks_id_seq'::regclass);


--
-- Name: newsletter_metrics id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.newsletter_metrics ALTER COLUMN id SET DEFAULT nextval('public.newsletter_metrics_id_seq'::regclass);


--
-- Name: newsletter_opens id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.newsletter_opens ALTER COLUMN id SET DEFAULT nextval('public.newsletter_opens_id_seq'::regclass);


--
-- Name: newsletter_templates id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.newsletter_templates ALTER COLUMN id SET DEFAULT nextval('public.newsletter_templates_id_seq'::regclass);


--
-- Name: scheduled_emails id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.scheduled_emails ALTER COLUMN id SET DEFAULT nextval('public.scheduled_emails_id_seq'::regclass);


--
-- Name: scheduled_newsletters id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.scheduled_newsletters ALTER COLUMN id SET DEFAULT nextval('public.scheduled_newsletters_id_seq'::regclass);


--
-- Name: subscribers id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.subscribers ALTER COLUMN id SET DEFAULT nextval('public.subscribers_id_seq'::regclass);


--
-- Name: tags id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.tags ALTER COLUMN id SET DEFAULT nextval('public.tags_id_seq'::regclass);


--
-- Name: user_credits id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.user_credits ALTER COLUMN id SET DEFAULT nextval('public.user_credits_id_seq'::regclass);


--
-- Name: user_feedback id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.user_feedback ALTER COLUMN id SET DEFAULT nextval('public.user_feedback_id_seq'::regclass);


--
-- Name: user_redeemed_codes id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.user_redeemed_codes ALTER COLUMN id SET DEFAULT nextval('public.user_redeemed_codes_id_seq'::regclass);


--
-- Name: user_subscriptions id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.user_subscriptions ALTER COLUMN id SET DEFAULT nextval('public.user_subscriptions_id_seq'::regclass);


--
-- Name: verified_emails id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.verified_emails ALTER COLUMN id SET DEFAULT nextval('public.verified_emails_id_seq'::regclass);


--
-- Data for Name: api_keys; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.api_keys (id, user_id, openai_key, news_api_key, use_custom_openai, use_custom_news_api, created_at, updated_at) FROM stdin;
2	9	\N	\N	f	f	2025-01-05 08:06:30.65218+00	2025-01-05 08:06:30.65218+00
\.


--
-- Data for Name: appsumo_codes; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.appsumo_codes (id, code, is_redeemed, redeemed_at, redeemed_by, created_at) FROM stdin;
6015	11786	f	\N	\N	2025-01-31 15:20:03.281106+00
6016	13192	f	\N	\N	2025-01-31 15:20:03.281106+00
6017	11300	f	\N	\N	2025-01-31 15:20:03.281106+00
6018	22615	f	\N	\N	2025-01-31 15:20:03.281106+00
6019	15144	f	\N	\N	2025-01-31 15:20:03.281106+00
6020	22437	f	\N	\N	2025-01-31 15:20:03.281106+00
6021	83488	f	\N	\N	2025-01-31 15:20:03.281106+00
6022	76877	f	\N	\N	2025-01-31 15:20:03.281106+00
6023	87515	f	\N	\N	2025-01-31 15:20:03.281106+00
6024	81718	f	\N	\N	2025-01-31 15:20:03.281106+00
6025	19962	f	\N	\N	2025-01-31 15:20:03.281106+00
6026	63321	f	\N	\N	2025-01-31 15:20:03.281106+00
6027	23090	f	\N	\N	2025-01-31 15:20:03.281106+00
6028	92725	f	\N	\N	2025-01-31 15:20:03.281106+00
6029	61559	f	\N	\N	2025-01-31 15:20:03.281106+00
6030	78699	f	\N	\N	2025-01-31 15:20:03.281106+00
6031	76657	f	\N	\N	2025-01-31 15:20:03.281106+00
6032	10488	f	\N	\N	2025-01-31 15:20:03.281106+00
6033	93964	f	\N	\N	2025-01-31 15:20:03.281106+00
6034	74788	f	\N	\N	2025-01-31 15:20:03.281106+00
6035	71755	f	\N	\N	2025-01-31 15:20:03.281106+00
6036	95945	f	\N	\N	2025-01-31 15:20:03.281106+00
6037	80257	f	\N	\N	2025-01-31 15:20:03.281106+00
6038	16984	f	\N	\N	2025-01-31 15:20:03.281106+00
6039	74322	f	\N	\N	2025-01-31 15:20:03.281106+00
6040	38159	f	\N	\N	2025-01-31 15:20:03.281106+00
6041	95422	f	\N	\N	2025-01-31 15:20:03.281106+00
6042	13753	f	\N	\N	2025-01-31 15:20:03.281106+00
6043	37587	f	\N	\N	2025-01-31 15:20:03.281106+00
6044	35202	f	\N	\N	2025-01-31 15:20:03.281106+00
6045	38671	f	\N	\N	2025-01-31 15:20:03.281106+00
6046	84696	f	\N	\N	2025-01-31 15:20:03.281106+00
6047	32830	f	\N	\N	2025-01-31 15:20:03.281106+00
6048	44674	f	\N	\N	2025-01-31 15:20:03.281106+00
6049	99421	f	\N	\N	2025-01-31 15:20:03.281106+00
6050	35801	f	\N	\N	2025-01-31 15:20:03.281106+00
6051	85701	f	\N	\N	2025-01-31 15:20:03.281106+00
6052	27852	f	\N	\N	2025-01-31 15:20:03.281106+00
6053	65469	f	\N	\N	2025-01-31 15:20:03.281106+00
6054	77976	f	\N	\N	2025-01-31 15:20:03.281106+00
6055	76906	f	\N	\N	2025-01-31 15:20:03.281106+00
6056	68029	f	\N	\N	2025-01-31 15:20:03.281106+00
6057	52810	f	\N	\N	2025-01-31 15:20:03.281106+00
6058	22870	f	\N	\N	2025-01-31 15:20:03.281106+00
6059	55975	f	\N	\N	2025-01-31 15:20:03.281106+00
6060	67534	f	\N	\N	2025-01-31 15:20:03.281106+00
6061	86394	f	\N	\N	2025-01-31 15:20:03.281106+00
6062	40989	f	\N	\N	2025-01-31 15:20:03.281106+00
6063	25827	f	\N	\N	2025-01-31 15:20:03.281106+00
6064	44406	f	\N	\N	2025-01-31 15:20:03.281106+00
6065	98675	f	\N	\N	2025-01-31 15:20:03.281106+00
6066	27655	f	\N	\N	2025-01-31 15:20:03.281106+00
6067	65917	f	\N	\N	2025-01-31 15:20:03.281106+00
6068	43605	f	\N	\N	2025-01-31 15:20:03.281106+00
6069	37959	f	\N	\N	2025-01-31 15:20:03.281106+00
6070	27663	f	\N	\N	2025-01-31 15:20:03.281106+00
6071	38871	f	\N	\N	2025-01-31 15:20:03.281106+00
6072	27124	f	\N	\N	2025-01-31 15:20:03.281106+00
6073	59438	f	\N	\N	2025-01-31 15:20:03.281106+00
6074	97425	f	\N	\N	2025-01-31 15:20:03.281106+00
6075	69318	f	\N	\N	2025-01-31 15:20:03.281106+00
6076	26828	f	\N	\N	2025-01-31 15:20:03.281106+00
6077	90240	f	\N	\N	2025-01-31 15:20:03.281106+00
6078	47247	f	\N	\N	2025-01-31 15:20:03.281106+00
6079	73080	f	\N	\N	2025-01-31 15:20:03.281106+00
6080	98832	f	\N	\N	2025-01-31 15:20:03.281106+00
6081	30923	f	\N	\N	2025-01-31 15:20:03.281106+00
6082	98638	f	\N	\N	2025-01-31 15:20:03.281106+00
6083	61443	f	\N	\N	2025-01-31 15:20:03.281106+00
6084	32372	f	\N	\N	2025-01-31 15:20:03.281106+00
6085	88862	f	\N	\N	2025-01-31 15:20:03.281106+00
6086	33532	f	\N	\N	2025-01-31 15:20:03.281106+00
6087	49063	f	\N	\N	2025-01-31 15:20:03.281106+00
6088	40734	f	\N	\N	2025-01-31 15:20:03.281106+00
6089	41422	f	\N	\N	2025-01-31 15:20:03.281106+00
6090	51950	f	\N	\N	2025-01-31 15:20:03.281106+00
6091	81596	f	\N	\N	2025-01-31 15:20:03.281106+00
6092	73472	f	\N	\N	2025-01-31 15:20:03.281106+00
6093	77793	f	\N	\N	2025-01-31 15:20:03.281106+00
6094	95839	f	\N	\N	2025-01-31 15:20:03.281106+00
6095	71417	f	\N	\N	2025-01-31 15:20:03.281106+00
6096	11235	f	\N	\N	2025-01-31 15:20:03.281106+00
6097	39735	f	\N	\N	2025-01-31 15:20:03.281106+00
6098	61601	f	\N	\N	2025-01-31 15:20:03.281106+00
6099	52285	f	\N	\N	2025-01-31 15:20:03.281106+00
6100	32915	f	\N	\N	2025-01-31 15:20:03.281106+00
6101	43998	f	\N	\N	2025-01-31 15:20:03.281106+00
6102	92976	f	\N	\N	2025-01-31 15:20:03.281106+00
6103	54339	f	\N	\N	2025-01-31 15:20:03.281106+00
6104	60211	f	\N	\N	2025-01-31 15:20:03.281106+00
6105	16313	f	\N	\N	2025-01-31 15:20:03.281106+00
6106	20264	f	\N	\N	2025-01-31 15:20:03.281106+00
6107	50083	f	\N	\N	2025-01-31 15:20:03.281106+00
6108	60768	f	\N	\N	2025-01-31 15:20:03.281106+00
6109	27016	f	\N	\N	2025-01-31 15:20:03.281106+00
6110	54397	f	\N	\N	2025-01-31 15:20:03.281106+00
6111	80816	f	\N	\N	2025-01-31 15:20:03.281106+00
6112	86429	f	\N	\N	2025-01-31 15:20:03.281106+00
6113	92562	f	\N	\N	2025-01-31 15:20:03.281106+00
6114	20669	f	\N	\N	2025-01-31 15:20:03.281106+00
6115	21821	f	\N	\N	2025-01-31 15:20:03.281106+00
6116	23227	f	\N	\N	2025-01-31 15:20:03.281106+00
6117	62505	f	\N	\N	2025-01-31 15:20:03.281106+00
6118	94637	f	\N	\N	2025-01-31 15:20:03.281106+00
6119	91797	f	\N	\N	2025-01-31 15:20:03.281106+00
6120	24433	f	\N	\N	2025-01-31 15:20:03.281106+00
6121	28283	f	\N	\N	2025-01-31 15:20:03.281106+00
6122	82191	f	\N	\N	2025-01-31 15:20:03.281106+00
6123	10829	f	\N	\N	2025-01-31 15:20:03.281106+00
6124	48052	f	\N	\N	2025-01-31 15:20:03.281106+00
6125	93850	f	\N	\N	2025-01-31 15:20:03.281106+00
6126	67921	f	\N	\N	2025-01-31 15:20:03.281106+00
6127	51541	f	\N	\N	2025-01-31 15:20:03.281106+00
6128	97878	f	\N	\N	2025-01-31 15:20:03.281106+00
6129	58491	f	\N	\N	2025-01-31 15:20:03.281106+00
6130	10240	f	\N	\N	2025-01-31 15:20:03.281106+00
6131	55000	f	\N	\N	2025-01-31 15:20:03.281106+00
6132	40238	f	\N	\N	2025-01-31 15:20:03.281106+00
6133	19304	f	\N	\N	2025-01-31 15:20:03.281106+00
6134	99156	f	\N	\N	2025-01-31 15:20:03.281106+00
6135	20980	f	\N	\N	2025-01-31 15:20:03.281106+00
6136	89929	f	\N	\N	2025-01-31 15:20:03.281106+00
6137	52213	f	\N	\N	2025-01-31 15:20:03.281106+00
6138	81427	f	\N	\N	2025-01-31 15:20:03.281106+00
6139	48448	f	\N	\N	2025-01-31 15:20:03.281106+00
6008	43407	t	2025-02-04 18:20:30.062+00	85	2025-01-31 15:20:03.281106+00
6009	19196	t	2025-02-04 18:20:30.062+00	85	2025-01-31 15:20:03.281106+00
6012	14414	t	2025-02-05 11:31:42.526+00	86	2025-01-31 15:20:03.281106+00
6013	92516	t	2025-02-05 11:31:42.526+00	86	2025-01-31 15:20:03.281106+00
6014	41914	t	2025-02-05 11:31:42.526+00	86	2025-01-31 15:20:03.281106+00
6011	95660	t	2025-03-17 08:20:30.424+00	\N	2025-01-31 15:20:03.281106+00
6140	13479	f	\N	\N	2025-01-31 15:20:03.281106+00
6141	97227	f	\N	\N	2025-01-31 15:20:03.281106+00
6142	74732	f	\N	\N	2025-01-31 15:20:03.281106+00
6143	52591	f	\N	\N	2025-01-31 15:20:03.281106+00
6144	35906	f	\N	\N	2025-01-31 15:20:03.281106+00
6145	44410	f	\N	\N	2025-01-31 15:20:03.281106+00
6146	86857	f	\N	\N	2025-01-31 15:20:03.281106+00
6147	78237	f	\N	\N	2025-01-31 15:20:03.281106+00
6148	56831	f	\N	\N	2025-01-31 15:20:03.281106+00
6149	47428	f	\N	\N	2025-01-31 15:20:03.281106+00
6150	83218	f	\N	\N	2025-01-31 15:20:03.281106+00
6151	62182	f	\N	\N	2025-01-31 15:20:03.281106+00
6152	20478	f	\N	\N	2025-01-31 15:20:03.281106+00
6153	89003	f	\N	\N	2025-01-31 15:20:03.281106+00
6154	82166	f	\N	\N	2025-01-31 15:20:03.281106+00
6155	98259	f	\N	\N	2025-01-31 15:20:03.281106+00
6156	15756	f	\N	\N	2025-01-31 15:20:03.281106+00
6157	27530	f	\N	\N	2025-01-31 15:20:03.281106+00
6158	72664	f	\N	\N	2025-01-31 15:20:03.281106+00
6159	65212	f	\N	\N	2025-01-31 15:20:03.281106+00
6160	55011	f	\N	\N	2025-01-31 15:20:03.281106+00
6161	76464	f	\N	\N	2025-01-31 15:20:03.281106+00
6162	97605	f	\N	\N	2025-01-31 15:20:03.281106+00
6163	12018	f	\N	\N	2025-01-31 15:20:03.281106+00
6164	28371	f	\N	\N	2025-01-31 15:20:03.281106+00
6165	47883	f	\N	\N	2025-01-31 15:20:03.281106+00
6166	27586	f	\N	\N	2025-01-31 15:20:03.281106+00
6167	69372	f	\N	\N	2025-01-31 15:20:03.281106+00
6168	54817	f	\N	\N	2025-01-31 15:20:03.281106+00
6169	62674	f	\N	\N	2025-01-31 15:20:03.281106+00
6170	36787	f	\N	\N	2025-01-31 15:20:03.281106+00
6171	57288	f	\N	\N	2025-01-31 15:20:03.281106+00
6172	46563	f	\N	\N	2025-01-31 15:20:03.281106+00
6173	62664	f	\N	\N	2025-01-31 15:20:03.281106+00
6174	19182	f	\N	\N	2025-01-31 15:20:03.281106+00
6175	89596	f	\N	\N	2025-01-31 15:20:03.281106+00
6176	28539	f	\N	\N	2025-01-31 15:20:03.281106+00
6177	47580	f	\N	\N	2025-01-31 15:20:03.281106+00
6178	99713	f	\N	\N	2025-01-31 15:20:03.281106+00
6179	89469	f	\N	\N	2025-01-31 15:20:03.281106+00
6180	57844	f	\N	\N	2025-01-31 15:20:03.281106+00
6181	28227	f	\N	\N	2025-01-31 15:20:03.281106+00
6182	84851	f	\N	\N	2025-01-31 15:20:03.281106+00
6183	54311	f	\N	\N	2025-01-31 15:20:03.281106+00
6184	96270	f	\N	\N	2025-01-31 15:20:03.281106+00
6185	30598	f	\N	\N	2025-01-31 15:20:03.281106+00
6186	28225	f	\N	\N	2025-01-31 15:20:03.281106+00
6187	93746	f	\N	\N	2025-01-31 15:20:03.281106+00
6188	54524	f	\N	\N	2025-01-31 15:20:03.281106+00
6189	28871	f	\N	\N	2025-01-31 15:20:03.281106+00
6190	13448	f	\N	\N	2025-01-31 15:20:03.281106+00
6191	34866	f	\N	\N	2025-01-31 15:20:03.281106+00
6192	57690	f	\N	\N	2025-01-31 15:20:03.281106+00
6193	89827	f	\N	\N	2025-01-31 15:20:03.281106+00
6194	23102	f	\N	\N	2025-01-31 15:20:03.281106+00
6195	24339	f	\N	\N	2025-01-31 15:20:03.281106+00
6196	54284	f	\N	\N	2025-01-31 15:20:03.281106+00
6197	93911	f	\N	\N	2025-01-31 15:20:03.281106+00
6198	25210	f	\N	\N	2025-01-31 15:20:03.281106+00
6199	16666	f	\N	\N	2025-01-31 15:20:03.281106+00
6200	31790	f	\N	\N	2025-01-31 15:20:03.281106+00
6201	43480	f	\N	\N	2025-01-31 15:20:03.281106+00
6202	70733	f	\N	\N	2025-01-31 15:20:03.281106+00
6203	53102	f	\N	\N	2025-01-31 15:20:03.281106+00
6204	68687	f	\N	\N	2025-01-31 15:20:03.281106+00
6205	72772	f	\N	\N	2025-01-31 15:20:03.281106+00
6206	13311	f	\N	\N	2025-01-31 15:20:03.281106+00
6207	86799	f	\N	\N	2025-01-31 15:20:03.281106+00
6208	96130	f	\N	\N	2025-01-31 15:20:03.281106+00
6209	19332	f	\N	\N	2025-01-31 15:20:03.281106+00
6210	76091	f	\N	\N	2025-01-31 15:20:03.281106+00
6211	20890	f	\N	\N	2025-01-31 15:20:03.281106+00
6212	66903	f	\N	\N	2025-01-31 15:20:03.281106+00
6213	11955	f	\N	\N	2025-01-31 15:20:03.281106+00
6214	87330	f	\N	\N	2025-01-31 15:20:03.281106+00
6215	45151	f	\N	\N	2025-01-31 15:20:03.281106+00
6216	30742	f	\N	\N	2025-01-31 15:20:03.281106+00
6217	96934	f	\N	\N	2025-01-31 15:20:03.281106+00
6218	79085	f	\N	\N	2025-01-31 15:20:03.281106+00
6219	80954	f	\N	\N	2025-01-31 15:20:03.281106+00
6220	50559	f	\N	\N	2025-01-31 15:20:03.281106+00
6221	96864	f	\N	\N	2025-01-31 15:20:03.281106+00
6222	62006	f	\N	\N	2025-01-31 15:20:03.281106+00
6223	69328	f	\N	\N	2025-01-31 15:20:03.281106+00
6224	65987	f	\N	\N	2025-01-31 15:20:03.281106+00
6225	77759	f	\N	\N	2025-01-31 15:20:03.281106+00
6226	23945	f	\N	\N	2025-01-31 15:20:03.281106+00
6227	81907	f	\N	\N	2025-01-31 15:20:03.281106+00
6228	20715	f	\N	\N	2025-01-31 15:20:03.281106+00
6229	10688	f	\N	\N	2025-01-31 15:20:03.281106+00
6230	27285	f	\N	\N	2025-01-31 15:20:03.281106+00
6231	96252	f	\N	\N	2025-01-31 15:20:03.281106+00
6232	86820	f	\N	\N	2025-01-31 15:20:03.281106+00
6233	19099	f	\N	\N	2025-01-31 15:20:03.281106+00
6234	22450	f	\N	\N	2025-01-31 15:20:03.281106+00
6235	71410	f	\N	\N	2025-01-31 15:20:03.281106+00
6236	57795	f	\N	\N	2025-01-31 15:20:03.281106+00
6237	23835	f	\N	\N	2025-01-31 15:20:03.281106+00
6238	69919	f	\N	\N	2025-01-31 15:20:03.281106+00
6239	29827	f	\N	\N	2025-01-31 15:20:03.281106+00
6240	27007	f	\N	\N	2025-01-31 15:20:03.281106+00
6241	41780	f	\N	\N	2025-01-31 15:20:03.281106+00
6242	41905	f	\N	\N	2025-01-31 15:20:03.281106+00
6243	11298	f	\N	\N	2025-01-31 15:20:03.281106+00
6244	47817	f	\N	\N	2025-01-31 15:20:03.281106+00
6245	68881	f	\N	\N	2025-01-31 15:20:03.281106+00
6246	96957	f	\N	\N	2025-01-31 15:20:03.281106+00
6247	62613	f	\N	\N	2025-01-31 15:20:03.281106+00
6248	80435	f	\N	\N	2025-01-31 15:20:03.281106+00
6249	24149	f	\N	\N	2025-01-31 15:20:03.281106+00
6250	77625	f	\N	\N	2025-01-31 15:20:03.281106+00
6251	18217	f	\N	\N	2025-01-31 15:20:03.281106+00
6252	81528	f	\N	\N	2025-01-31 15:20:03.281106+00
6253	49687	f	\N	\N	2025-01-31 15:20:03.281106+00
6254	92977	f	\N	\N	2025-01-31 15:20:03.281106+00
6255	77595	f	\N	\N	2025-01-31 15:20:03.281106+00
6256	45071	f	\N	\N	2025-01-31 15:20:03.281106+00
6257	87539	f	\N	\N	2025-01-31 15:20:03.281106+00
6258	78580	f	\N	\N	2025-01-31 15:20:03.281106+00
6259	70520	f	\N	\N	2025-01-31 15:20:03.281106+00
6260	73111	f	\N	\N	2025-01-31 15:20:03.281106+00
6261	65767	f	\N	\N	2025-01-31 15:20:03.281106+00
6262	51154	f	\N	\N	2025-01-31 15:20:03.281106+00
6263	26717	f	\N	\N	2025-01-31 15:20:03.281106+00
6264	91929	f	\N	\N	2025-01-31 15:20:03.281106+00
6265	44750	f	\N	\N	2025-01-31 15:20:03.281106+00
6266	55287	f	\N	\N	2025-01-31 15:20:03.281106+00
6267	48332	f	\N	\N	2025-01-31 15:20:03.281106+00
6268	68337	f	\N	\N	2025-01-31 15:20:03.281106+00
6269	49784	f	\N	\N	2025-01-31 15:20:03.281106+00
6270	70976	f	\N	\N	2025-01-31 15:20:03.281106+00
6271	56843	f	\N	\N	2025-01-31 15:20:03.281106+00
6272	48344	f	\N	\N	2025-01-31 15:20:03.281106+00
6273	94187	f	\N	\N	2025-01-31 15:20:03.281106+00
6274	78182	f	\N	\N	2025-01-31 15:20:03.281106+00
6275	25735	f	\N	\N	2025-01-31 15:20:03.281106+00
6276	80679	f	\N	\N	2025-01-31 15:20:03.281106+00
6277	49516	f	\N	\N	2025-01-31 15:20:03.281106+00
6278	11425	f	\N	\N	2025-01-31 15:20:03.281106+00
6279	69778	f	\N	\N	2025-01-31 15:20:03.281106+00
6280	52567	f	\N	\N	2025-01-31 15:20:03.281106+00
6281	67386	f	\N	\N	2025-01-31 15:20:03.281106+00
6282	58715	f	\N	\N	2025-01-31 15:20:03.281106+00
6283	48384	f	\N	\N	2025-01-31 15:20:03.281106+00
6284	67627	f	\N	\N	2025-01-31 15:20:03.281106+00
6285	75284	f	\N	\N	2025-01-31 15:20:03.281106+00
6286	65492	f	\N	\N	2025-01-31 15:20:03.281106+00
6287	41876	f	\N	\N	2025-01-31 15:20:03.281106+00
6288	10639	f	\N	\N	2025-01-31 15:20:03.281106+00
6289	97510	f	\N	\N	2025-01-31 15:20:03.281106+00
6290	68286	f	\N	\N	2025-01-31 15:20:03.281106+00
6291	12341	f	\N	\N	2025-01-31 15:20:03.281106+00
6292	34391	f	\N	\N	2025-01-31 15:20:03.281106+00
6293	98783	f	\N	\N	2025-01-31 15:20:03.281106+00
6294	61686	f	\N	\N	2025-01-31 15:20:03.281106+00
6295	66728	f	\N	\N	2025-01-31 15:20:03.281106+00
6296	61424	f	\N	\N	2025-01-31 15:20:03.281106+00
6297	95828	f	\N	\N	2025-01-31 15:20:03.281106+00
6298	40820	f	\N	\N	2025-01-31 15:20:03.281106+00
6299	96519	f	\N	\N	2025-01-31 15:20:03.281106+00
6300	88124	f	\N	\N	2025-01-31 15:20:03.281106+00
6301	65931	f	\N	\N	2025-01-31 15:20:03.281106+00
6302	89272	f	\N	\N	2025-01-31 15:20:03.281106+00
6303	67078	f	\N	\N	2025-01-31 15:20:03.281106+00
6304	79958	f	\N	\N	2025-01-31 15:20:03.281106+00
6305	59133	f	\N	\N	2025-01-31 15:20:03.281106+00
6306	12601	f	\N	\N	2025-01-31 15:20:03.281106+00
6307	15887	f	\N	\N	2025-01-31 15:20:03.281106+00
6308	65681	f	\N	\N	2025-01-31 15:20:03.281106+00
6309	54322	f	\N	\N	2025-01-31 15:20:03.281106+00
6310	21828	f	\N	\N	2025-01-31 15:20:03.281106+00
6311	72433	f	\N	\N	2025-01-31 15:20:03.281106+00
6312	86780	f	\N	\N	2025-01-31 15:20:03.281106+00
6313	99672	f	\N	\N	2025-01-31 15:20:03.281106+00
6314	43422	f	\N	\N	2025-01-31 15:20:03.281106+00
6315	34443	f	\N	\N	2025-01-31 15:20:03.281106+00
6316	96229	f	\N	\N	2025-01-31 15:20:03.281106+00
6317	83787	f	\N	\N	2025-01-31 15:20:03.281106+00
6318	64333	f	\N	\N	2025-01-31 15:20:03.281106+00
6319	20292	f	\N	\N	2025-01-31 15:20:03.281106+00
6320	98427	f	\N	\N	2025-01-31 15:20:03.281106+00
6321	29740	f	\N	\N	2025-01-31 15:20:03.281106+00
6322	30635	f	\N	\N	2025-01-31 15:20:03.281106+00
6323	78211	f	\N	\N	2025-01-31 15:20:03.281106+00
6324	65909	f	\N	\N	2025-01-31 15:20:03.281106+00
6325	94350	f	\N	\N	2025-01-31 15:20:03.281106+00
6326	58356	f	\N	\N	2025-01-31 15:20:03.281106+00
6327	64512	f	\N	\N	2025-01-31 15:20:03.281106+00
6328	57509	f	\N	\N	2025-01-31 15:20:03.281106+00
6329	76422	f	\N	\N	2025-01-31 15:20:03.281106+00
6330	70612	f	\N	\N	2025-01-31 15:20:03.281106+00
6331	26820	f	\N	\N	2025-01-31 15:20:03.281106+00
6332	39732	f	\N	\N	2025-01-31 15:20:03.281106+00
6333	92925	f	\N	\N	2025-01-31 15:20:03.281106+00
6334	63064	f	\N	\N	2025-01-31 15:20:03.281106+00
6335	78552	f	\N	\N	2025-01-31 15:20:03.281106+00
6336	90863	f	\N	\N	2025-01-31 15:20:03.281106+00
6337	62929	f	\N	\N	2025-01-31 15:20:03.281106+00
6338	43594	f	\N	\N	2025-01-31 15:20:03.281106+00
6339	69581	f	\N	\N	2025-01-31 15:20:03.281106+00
6340	57194	f	\N	\N	2025-01-31 15:20:03.281106+00
6341	90137	f	\N	\N	2025-01-31 15:20:03.281106+00
6342	31295	f	\N	\N	2025-01-31 15:20:03.281106+00
6343	31153	f	\N	\N	2025-01-31 15:20:03.281106+00
6344	66944	f	\N	\N	2025-01-31 15:20:03.281106+00
6345	55910	f	\N	\N	2025-01-31 15:20:03.281106+00
6346	11730	f	\N	\N	2025-01-31 15:20:03.281106+00
6347	33273	f	\N	\N	2025-01-31 15:20:03.281106+00
6348	99384	f	\N	\N	2025-01-31 15:20:03.281106+00
6349	17249	f	\N	\N	2025-01-31 15:20:03.281106+00
6350	18303	f	\N	\N	2025-01-31 15:20:03.281106+00
6351	22468	f	\N	\N	2025-01-31 15:20:03.281106+00
6352	44104	f	\N	\N	2025-01-31 15:20:03.281106+00
6353	42414	f	\N	\N	2025-01-31 15:20:03.281106+00
6354	46769	f	\N	\N	2025-01-31 15:20:03.281106+00
6355	58775	f	\N	\N	2025-01-31 15:20:03.281106+00
6356	83503	f	\N	\N	2025-01-31 15:20:03.281106+00
6357	55985	f	\N	\N	2025-01-31 15:20:03.281106+00
6358	63907	f	\N	\N	2025-01-31 15:20:03.281106+00
6359	91135	f	\N	\N	2025-01-31 15:20:03.281106+00
6360	54759	f	\N	\N	2025-01-31 15:20:03.281106+00
6361	36883	f	\N	\N	2025-01-31 15:20:03.281106+00
6362	12906	f	\N	\N	2025-01-31 15:20:03.281106+00
6363	34376	f	\N	\N	2025-01-31 15:20:03.281106+00
6364	55612	f	\N	\N	2025-01-31 15:20:03.281106+00
6365	85693	f	\N	\N	2025-01-31 15:20:03.281106+00
6366	52418	f	\N	\N	2025-01-31 15:20:03.281106+00
6367	43935	f	\N	\N	2025-01-31 15:20:03.281106+00
6368	90039	f	\N	\N	2025-01-31 15:20:03.281106+00
6369	50847	f	\N	\N	2025-01-31 15:20:03.281106+00
6370	17641	f	\N	\N	2025-01-31 15:20:03.281106+00
6371	48945	f	\N	\N	2025-01-31 15:20:03.281106+00
6372	42885	f	\N	\N	2025-01-31 15:20:03.281106+00
6373	11799	f	\N	\N	2025-01-31 15:20:03.281106+00
6374	18115	f	\N	\N	2025-01-31 15:20:03.281106+00
6375	27417	f	\N	\N	2025-01-31 15:20:03.281106+00
6376	20405	f	\N	\N	2025-01-31 15:20:03.281106+00
6377	15163	f	\N	\N	2025-01-31 15:20:03.281106+00
6378	23187	f	\N	\N	2025-01-31 15:20:03.281106+00
6379	25965	f	\N	\N	2025-01-31 15:20:03.281106+00
6380	43870	f	\N	\N	2025-01-31 15:20:03.281106+00
6381	40684	f	\N	\N	2025-01-31 15:20:03.281106+00
6382	14048	f	\N	\N	2025-01-31 15:20:03.281106+00
6383	63533	f	\N	\N	2025-01-31 15:20:03.281106+00
6384	29189	f	\N	\N	2025-01-31 15:20:03.281106+00
6385	97923	f	\N	\N	2025-01-31 15:20:03.281106+00
6386	85648	f	\N	\N	2025-01-31 15:20:03.281106+00
6387	19898	f	\N	\N	2025-01-31 15:20:03.281106+00
6388	12393	f	\N	\N	2025-01-31 15:20:03.281106+00
6389	12007	f	\N	\N	2025-01-31 15:20:03.281106+00
6390	54091	f	\N	\N	2025-01-31 15:20:03.281106+00
6391	32805	f	\N	\N	2025-01-31 15:20:03.281106+00
6392	99405	f	\N	\N	2025-01-31 15:20:03.281106+00
6393	60209	f	\N	\N	2025-01-31 15:20:03.281106+00
6394	97491	f	\N	\N	2025-01-31 15:20:03.281106+00
6395	95062	f	\N	\N	2025-01-31 15:20:03.281106+00
6396	59212	f	\N	\N	2025-01-31 15:20:03.281106+00
6397	54496	f	\N	\N	2025-01-31 15:20:03.281106+00
6398	39681	f	\N	\N	2025-01-31 15:20:03.281106+00
6399	50053	f	\N	\N	2025-01-31 15:20:03.281106+00
6400	69883	f	\N	\N	2025-01-31 15:20:03.281106+00
6401	23872	f	\N	\N	2025-01-31 15:20:03.281106+00
6402	10787	f	\N	\N	2025-01-31 15:20:03.281106+00
6403	90093	f	\N	\N	2025-01-31 15:20:03.281106+00
6404	21208	f	\N	\N	2025-01-31 15:20:03.281106+00
6405	10143	f	\N	\N	2025-01-31 15:20:03.281106+00
6406	49907	f	\N	\N	2025-01-31 15:20:03.281106+00
6407	15661	f	\N	\N	2025-01-31 15:20:03.281106+00
6408	14463	f	\N	\N	2025-01-31 15:20:03.281106+00
6409	36371	f	\N	\N	2025-01-31 15:20:03.281106+00
6410	97738	f	\N	\N	2025-01-31 15:20:03.281106+00
6411	26297	f	\N	\N	2025-01-31 15:20:03.281106+00
6412	24008	f	\N	\N	2025-01-31 15:20:03.281106+00
6413	87452	f	\N	\N	2025-01-31 15:20:03.281106+00
6414	15040	f	\N	\N	2025-01-31 15:20:03.281106+00
6415	59038	f	\N	\N	2025-01-31 15:20:03.281106+00
6416	98066	f	\N	\N	2025-01-31 15:20:03.281106+00
6417	22384	f	\N	\N	2025-01-31 15:20:03.281106+00
6418	60344	f	\N	\N	2025-01-31 15:20:03.281106+00
6419	37264	f	\N	\N	2025-01-31 15:20:03.281106+00
6420	29641	f	\N	\N	2025-01-31 15:20:03.281106+00
6421	45856	f	\N	\N	2025-01-31 15:20:03.281106+00
6422	68019	f	\N	\N	2025-01-31 15:20:03.281106+00
6423	89455	f	\N	\N	2025-01-31 15:20:03.281106+00
6424	19673	f	\N	\N	2025-01-31 15:20:03.281106+00
6425	35003	f	\N	\N	2025-01-31 15:20:03.281106+00
6426	86867	f	\N	\N	2025-01-31 15:20:03.281106+00
6427	40857	f	\N	\N	2025-01-31 15:20:03.281106+00
6428	53206	f	\N	\N	2025-01-31 15:20:03.281106+00
6429	56749	f	\N	\N	2025-01-31 15:20:03.281106+00
6430	28676	f	\N	\N	2025-01-31 15:20:03.281106+00
6431	16095	f	\N	\N	2025-01-31 15:20:03.281106+00
6432	11389	f	\N	\N	2025-01-31 15:20:03.281106+00
6433	65626	f	\N	\N	2025-01-31 15:20:03.281106+00
6434	91446	f	\N	\N	2025-01-31 15:20:03.281106+00
6435	43463	f	\N	\N	2025-01-31 15:20:03.281106+00
6436	30771	f	\N	\N	2025-01-31 15:20:03.281106+00
6437	33937	f	\N	\N	2025-01-31 15:20:03.281106+00
6438	81068	f	\N	\N	2025-01-31 15:20:03.281106+00
6439	24138	f	\N	\N	2025-01-31 15:20:03.281106+00
6440	94973	f	\N	\N	2025-01-31 15:20:03.281106+00
6441	62690	f	\N	\N	2025-01-31 15:20:03.281106+00
6442	72833	f	\N	\N	2025-01-31 15:20:03.281106+00
6443	55540	f	\N	\N	2025-01-31 15:20:03.281106+00
6444	90197	f	\N	\N	2025-01-31 15:20:03.281106+00
6445	66544	f	\N	\N	2025-01-31 15:20:03.281106+00
6446	39867	f	\N	\N	2025-01-31 15:20:03.281106+00
6447	92143	f	\N	\N	2025-01-31 15:20:03.281106+00
6448	37340	f	\N	\N	2025-01-31 15:20:03.281106+00
6449	19830	f	\N	\N	2025-01-31 15:20:03.281106+00
6450	28994	f	\N	\N	2025-01-31 15:20:03.281106+00
6451	85939	f	\N	\N	2025-01-31 15:20:03.281106+00
6452	37450	f	\N	\N	2025-01-31 15:20:03.281106+00
6453	58639	f	\N	\N	2025-01-31 15:20:03.281106+00
6454	11637	f	\N	\N	2025-01-31 15:20:03.281106+00
6455	64352	f	\N	\N	2025-01-31 15:20:03.281106+00
6456	57724	f	\N	\N	2025-01-31 15:20:03.281106+00
6457	93325	f	\N	\N	2025-01-31 15:20:03.281106+00
6458	88458	f	\N	\N	2025-01-31 15:20:03.281106+00
6459	77445	f	\N	\N	2025-01-31 15:20:03.281106+00
6460	92712	f	\N	\N	2025-01-31 15:20:03.281106+00
6461	26984	f	\N	\N	2025-01-31 15:20:03.281106+00
6462	11806	f	\N	\N	2025-01-31 15:20:03.281106+00
6463	98537	f	\N	\N	2025-01-31 15:20:03.281106+00
6464	42506	f	\N	\N	2025-01-31 15:20:03.281106+00
6465	56623	f	\N	\N	2025-01-31 15:20:03.281106+00
6466	53821	f	\N	\N	2025-01-31 15:20:03.281106+00
6467	39951	f	\N	\N	2025-01-31 15:20:03.281106+00
6468	58168	f	\N	\N	2025-01-31 15:20:03.281106+00
6469	48690	f	\N	\N	2025-01-31 15:20:03.281106+00
6470	40452	f	\N	\N	2025-01-31 15:20:03.281106+00
6471	72105	f	\N	\N	2025-01-31 15:20:03.281106+00
6472	45258	f	\N	\N	2025-01-31 15:20:03.281106+00
6473	76826	f	\N	\N	2025-01-31 15:20:03.281106+00
6474	96860	f	\N	\N	2025-01-31 15:20:03.281106+00
6475	69549	f	\N	\N	2025-01-31 15:20:03.281106+00
6476	15893	f	\N	\N	2025-01-31 15:20:03.281106+00
6477	13793	f	\N	\N	2025-01-31 15:20:03.281106+00
6478	20690	f	\N	\N	2025-01-31 15:20:03.281106+00
6479	78510	f	\N	\N	2025-01-31 15:20:03.281106+00
6480	50265	f	\N	\N	2025-01-31 15:20:03.281106+00
6481	90297	f	\N	\N	2025-01-31 15:20:03.281106+00
6482	15285	f	\N	\N	2025-01-31 15:20:03.281106+00
6483	87988	f	\N	\N	2025-01-31 15:20:03.281106+00
6484	38097	f	\N	\N	2025-01-31 15:20:03.281106+00
6485	25739	f	\N	\N	2025-01-31 15:20:03.281106+00
6486	71101	f	\N	\N	2025-01-31 15:20:03.281106+00
6487	92864	f	\N	\N	2025-01-31 15:20:03.281106+00
6488	68816	f	\N	\N	2025-01-31 15:20:03.281106+00
6489	43743	f	\N	\N	2025-01-31 15:20:03.281106+00
6490	35338	f	\N	\N	2025-01-31 15:20:03.281106+00
6491	40216	f	\N	\N	2025-01-31 15:20:03.281106+00
6492	53756	f	\N	\N	2025-01-31 15:20:03.281106+00
6493	59070	f	\N	\N	2025-01-31 15:20:03.281106+00
6494	79104	f	\N	\N	2025-01-31 15:20:03.281106+00
6495	38177	f	\N	\N	2025-01-31 15:20:03.281106+00
6496	39135	f	\N	\N	2025-01-31 15:20:03.281106+00
6497	46450	f	\N	\N	2025-01-31 15:20:03.281106+00
6498	81168	f	\N	\N	2025-01-31 15:20:03.281106+00
6499	21055	f	\N	\N	2025-01-31 15:20:03.281106+00
6500	58519	f	\N	\N	2025-01-31 15:20:03.281106+00
6501	17335	f	\N	\N	2025-01-31 15:20:03.281106+00
6502	18141	f	\N	\N	2025-01-31 15:20:03.281106+00
6503	39096	f	\N	\N	2025-01-31 15:20:03.281106+00
6504	10007	f	\N	\N	2025-01-31 15:20:03.281106+00
6505	38232	f	\N	\N	2025-01-31 15:20:03.281106+00
6506	11884	f	\N	\N	2025-01-31 15:20:03.281106+00
6507	54323	f	\N	\N	2025-01-31 15:20:03.281106+00
6508	43871	f	\N	\N	2025-01-31 15:20:03.281106+00
6509	64084	f	\N	\N	2025-01-31 15:20:03.281106+00
6510	46657	f	\N	\N	2025-01-31 15:20:03.281106+00
6511	32798	f	\N	\N	2025-01-31 15:20:03.281106+00
6512	80703	f	\N	\N	2025-01-31 15:20:03.281106+00
6513	59554	f	\N	\N	2025-01-31 15:20:03.281106+00
6514	71938	f	\N	\N	2025-01-31 15:20:03.281106+00
6515	17774	f	\N	\N	2025-01-31 15:20:03.281106+00
6516	48286	f	\N	\N	2025-01-31 15:20:03.281106+00
6517	65441	f	\N	\N	2025-01-31 15:20:03.281106+00
6518	81368	f	\N	\N	2025-01-31 15:20:03.281106+00
6519	44384	f	\N	\N	2025-01-31 15:20:03.281106+00
6520	25784	f	\N	\N	2025-01-31 15:20:03.281106+00
6521	26832	f	\N	\N	2025-01-31 15:20:03.281106+00
6522	84472	f	\N	\N	2025-01-31 15:20:03.281106+00
6523	14801	f	\N	\N	2025-01-31 15:20:03.281106+00
6524	93573	f	\N	\N	2025-01-31 15:20:03.281106+00
6525	13298	f	\N	\N	2025-01-31 15:20:03.281106+00
6526	83545	f	\N	\N	2025-01-31 15:20:03.281106+00
6527	85306	f	\N	\N	2025-01-31 15:20:03.281106+00
6528	30516	f	\N	\N	2025-01-31 15:20:03.281106+00
6529	37848	f	\N	\N	2025-01-31 15:20:03.281106+00
6530	97900	f	\N	\N	2025-01-31 15:20:03.281106+00
6531	97823	f	\N	\N	2025-01-31 15:20:03.281106+00
6532	78592	f	\N	\N	2025-01-31 15:20:03.281106+00
6533	73974	f	\N	\N	2025-01-31 15:20:03.281106+00
6534	87325	f	\N	\N	2025-01-31 15:20:03.281106+00
6535	71552	f	\N	\N	2025-01-31 15:20:03.281106+00
6536	35317	f	\N	\N	2025-01-31 15:20:03.281106+00
6537	84557	f	\N	\N	2025-01-31 15:20:03.281106+00
6538	63720	f	\N	\N	2025-01-31 15:20:03.281106+00
6539	64110	f	\N	\N	2025-01-31 15:20:03.281106+00
6540	75119	f	\N	\N	2025-01-31 15:20:03.281106+00
6541	89013	f	\N	\N	2025-01-31 15:20:03.281106+00
6542	51312	f	\N	\N	2025-01-31 15:20:03.281106+00
6543	37053	f	\N	\N	2025-01-31 15:20:03.281106+00
6544	91726	f	\N	\N	2025-01-31 15:20:03.281106+00
6545	39995	f	\N	\N	2025-01-31 15:20:03.281106+00
6546	93356	f	\N	\N	2025-01-31 15:20:03.281106+00
6547	38570	f	\N	\N	2025-01-31 15:20:03.281106+00
6548	85822	f	\N	\N	2025-01-31 15:20:03.281106+00
6549	29969	f	\N	\N	2025-01-31 15:20:03.281106+00
6550	35443	f	\N	\N	2025-01-31 15:20:03.281106+00
6551	80512	f	\N	\N	2025-01-31 15:20:03.281106+00
6552	83350	f	\N	\N	2025-01-31 15:20:03.281106+00
6553	71507	f	\N	\N	2025-01-31 15:20:03.281106+00
6554	87045	f	\N	\N	2025-01-31 15:20:03.281106+00
6555	47235	f	\N	\N	2025-01-31 15:20:03.281106+00
6556	30094	f	\N	\N	2025-01-31 15:20:03.281106+00
6557	40236	f	\N	\N	2025-01-31 15:20:03.281106+00
6558	95898	f	\N	\N	2025-01-31 15:20:03.281106+00
6559	71580	f	\N	\N	2025-01-31 15:20:03.281106+00
6560	50640	f	\N	\N	2025-01-31 15:20:03.281106+00
6561	85741	f	\N	\N	2025-01-31 15:20:03.281106+00
6562	26580	f	\N	\N	2025-01-31 15:20:03.281106+00
6563	12325	f	\N	\N	2025-01-31 15:20:03.281106+00
6564	61298	f	\N	\N	2025-01-31 15:20:03.281106+00
6565	63589	f	\N	\N	2025-01-31 15:20:03.281106+00
6566	88513	f	\N	\N	2025-01-31 15:20:03.281106+00
6567	51487	f	\N	\N	2025-01-31 15:20:03.281106+00
6568	96416	f	\N	\N	2025-01-31 15:20:03.281106+00
6569	42584	f	\N	\N	2025-01-31 15:20:03.281106+00
6570	81309	f	\N	\N	2025-01-31 15:20:03.281106+00
6571	21476	f	\N	\N	2025-01-31 15:20:03.281106+00
6572	85755	f	\N	\N	2025-01-31 15:20:03.281106+00
6573	66238	f	\N	\N	2025-01-31 15:20:03.281106+00
6574	42552	f	\N	\N	2025-01-31 15:20:03.281106+00
6575	31310	f	\N	\N	2025-01-31 15:20:03.281106+00
6576	62669	f	\N	\N	2025-01-31 15:20:03.281106+00
6577	37574	f	\N	\N	2025-01-31 15:20:03.281106+00
6578	76513	f	\N	\N	2025-01-31 15:20:03.281106+00
6579	33954	f	\N	\N	2025-01-31 15:20:03.281106+00
6580	25877	f	\N	\N	2025-01-31 15:20:03.281106+00
6582	71765	f	\N	\N	2025-01-31 15:20:03.281106+00
6583	89321	f	\N	\N	2025-01-31 15:20:03.281106+00
6584	87493	f	\N	\N	2025-01-31 15:20:03.281106+00
6585	35360	f	\N	\N	2025-01-31 15:20:03.281106+00
6586	39346	f	\N	\N	2025-01-31 15:20:03.281106+00
6587	20134	f	\N	\N	2025-01-31 15:20:03.281106+00
6588	96391	f	\N	\N	2025-01-31 15:20:03.281106+00
6589	86307	f	\N	\N	2025-01-31 15:20:03.281106+00
6590	13658	f	\N	\N	2025-01-31 15:20:03.281106+00
6591	43991	f	\N	\N	2025-01-31 15:20:03.281106+00
6592	46690	f	\N	\N	2025-01-31 15:20:03.281106+00
6593	28057	f	\N	\N	2025-01-31 15:20:03.281106+00
6594	56950	f	\N	\N	2025-01-31 15:20:03.281106+00
6595	98090	f	\N	\N	2025-01-31 15:20:03.281106+00
6596	17258	f	\N	\N	2025-01-31 15:20:03.281106+00
6597	25858	f	\N	\N	2025-01-31 15:20:03.281106+00
6598	83291	f	\N	\N	2025-01-31 15:20:03.281106+00
6599	71196	f	\N	\N	2025-01-31 15:20:03.281106+00
6600	14258	f	\N	\N	2025-01-31 15:20:03.281106+00
6601	14418	f	\N	\N	2025-01-31 15:20:03.281106+00
6602	95508	f	\N	\N	2025-01-31 15:20:03.281106+00
6603	20243	f	\N	\N	2025-01-31 15:20:03.281106+00
6604	10965	f	\N	\N	2025-01-31 15:20:03.281106+00
6605	34809	f	\N	\N	2025-01-31 15:20:03.281106+00
6606	27488	f	\N	\N	2025-01-31 15:20:03.281106+00
6607	83571	f	\N	\N	2025-01-31 15:20:03.281106+00
6608	77707	f	\N	\N	2025-01-31 15:20:03.281106+00
6609	90308	f	\N	\N	2025-01-31 15:20:03.281106+00
6610	86689	f	\N	\N	2025-01-31 15:20:03.281106+00
6611	31708	f	\N	\N	2025-01-31 15:20:03.281106+00
6612	47509	f	\N	\N	2025-01-31 15:20:03.281106+00
6613	96697	f	\N	\N	2025-01-31 15:20:03.281106+00
6614	13507	f	\N	\N	2025-01-31 15:20:03.281106+00
6615	90379	f	\N	\N	2025-01-31 15:20:03.281106+00
6616	69242	f	\N	\N	2025-01-31 15:20:03.281106+00
6617	26271	f	\N	\N	2025-01-31 15:20:03.281106+00
6618	68110	f	\N	\N	2025-01-31 15:20:03.281106+00
6619	18654	f	\N	\N	2025-01-31 15:20:03.281106+00
6620	37823	f	\N	\N	2025-01-31 15:20:03.281106+00
6621	82760	f	\N	\N	2025-01-31 15:20:03.281106+00
6622	28258	f	\N	\N	2025-01-31 15:20:03.281106+00
6623	92763	f	\N	\N	2025-01-31 15:20:03.281106+00
6624	89966	f	\N	\N	2025-01-31 15:20:03.281106+00
6625	23974	f	\N	\N	2025-01-31 15:20:03.281106+00
6626	91689	f	\N	\N	2025-01-31 15:20:03.281106+00
6627	62172	f	\N	\N	2025-01-31 15:20:03.281106+00
6628	16916	f	\N	\N	2025-01-31 15:20:03.281106+00
6629	82687	f	\N	\N	2025-01-31 15:20:03.281106+00
6630	50061	f	\N	\N	2025-01-31 15:20:03.281106+00
6631	73887	f	\N	\N	2025-01-31 15:20:03.281106+00
6632	56340	f	\N	\N	2025-01-31 15:20:03.281106+00
6633	94939	f	\N	\N	2025-01-31 15:20:03.281106+00
6634	69903	f	\N	\N	2025-01-31 15:20:03.281106+00
6635	41701	f	\N	\N	2025-01-31 15:20:03.281106+00
6636	19506	f	\N	\N	2025-01-31 15:20:03.281106+00
6637	48852	f	\N	\N	2025-01-31 15:20:03.281106+00
6638	98270	f	\N	\N	2025-01-31 15:20:03.281106+00
6639	82554	f	\N	\N	2025-01-31 15:20:03.281106+00
6640	11370	f	\N	\N	2025-01-31 15:20:03.281106+00
6641	69566	f	\N	\N	2025-01-31 15:20:03.281106+00
6642	26283	f	\N	\N	2025-01-31 15:20:03.281106+00
6643	91927	f	\N	\N	2025-01-31 15:20:03.281106+00
6644	93542	f	\N	\N	2025-01-31 15:20:03.281106+00
6645	67025	f	\N	\N	2025-01-31 15:20:03.281106+00
6646	11866	f	\N	\N	2025-01-31 15:20:03.281106+00
6647	23575	f	\N	\N	2025-01-31 15:20:03.281106+00
6648	32638	f	\N	\N	2025-01-31 15:20:03.281106+00
6649	89994	f	\N	\N	2025-01-31 15:20:03.281106+00
6650	16566	f	\N	\N	2025-01-31 15:20:03.281106+00
6651	18340	f	\N	\N	2025-01-31 15:20:03.281106+00
6652	75100	f	\N	\N	2025-01-31 15:20:03.281106+00
6653	40441	f	\N	\N	2025-01-31 15:20:03.281106+00
6654	24015	f	\N	\N	2025-01-31 15:20:03.281106+00
6655	81108	f	\N	\N	2025-01-31 15:20:03.281106+00
6656	54277	f	\N	\N	2025-01-31 15:20:03.281106+00
6657	62265	f	\N	\N	2025-01-31 15:20:03.281106+00
6658	77150	f	\N	\N	2025-01-31 15:20:03.281106+00
6659	41408	f	\N	\N	2025-01-31 15:20:03.281106+00
6660	11061	f	\N	\N	2025-01-31 15:20:03.281106+00
6661	56101	f	\N	\N	2025-01-31 15:20:03.281106+00
6662	86695	f	\N	\N	2025-01-31 15:20:03.281106+00
6663	60003	f	\N	\N	2025-01-31 15:20:03.281106+00
6664	11614	f	\N	\N	2025-01-31 15:20:03.281106+00
6665	93308	f	\N	\N	2025-01-31 15:20:03.281106+00
6666	41819	f	\N	\N	2025-01-31 15:20:03.281106+00
6667	35993	f	\N	\N	2025-01-31 15:20:03.281106+00
6668	51405	f	\N	\N	2025-01-31 15:20:03.281106+00
6669	75215	f	\N	\N	2025-01-31 15:20:03.281106+00
6670	58769	f	\N	\N	2025-01-31 15:20:03.281106+00
6671	99555	f	\N	\N	2025-01-31 15:20:03.281106+00
6672	78040	f	\N	\N	2025-01-31 15:20:03.281106+00
6673	72003	f	\N	\N	2025-01-31 15:20:03.281106+00
6674	83044	f	\N	\N	2025-01-31 15:20:03.281106+00
6675	77986	f	\N	\N	2025-01-31 15:20:03.281106+00
6676	58613	f	\N	\N	2025-01-31 15:20:03.281106+00
6677	90233	f	\N	\N	2025-01-31 15:20:03.281106+00
6678	38160	f	\N	\N	2025-01-31 15:20:03.281106+00
6679	15520	f	\N	\N	2025-01-31 15:20:03.281106+00
6680	96407	f	\N	\N	2025-01-31 15:20:03.281106+00
6681	11740	f	\N	\N	2025-01-31 15:20:03.281106+00
6682	82294	f	\N	\N	2025-01-31 15:20:03.281106+00
6683	51533	f	\N	\N	2025-01-31 15:20:03.281106+00
6684	94027	f	\N	\N	2025-01-31 15:20:03.281106+00
6685	10264	f	\N	\N	2025-01-31 15:20:03.281106+00
6686	16523	f	\N	\N	2025-01-31 15:20:03.281106+00
6687	36165	f	\N	\N	2025-01-31 15:20:03.281106+00
6689	23612	f	\N	\N	2025-01-31 15:20:03.281106+00
6690	98835	f	\N	\N	2025-01-31 15:20:03.281106+00
6691	89139	f	\N	\N	2025-01-31 15:20:03.281106+00
6692	66927	f	\N	\N	2025-01-31 15:20:03.281106+00
6693	77637	f	\N	\N	2025-01-31 15:20:03.281106+00
6694	52843	f	\N	\N	2025-01-31 15:20:03.281106+00
6695	48026	f	\N	\N	2025-01-31 15:20:03.281106+00
6696	78226	f	\N	\N	2025-01-31 15:20:03.281106+00
6697	71839	f	\N	\N	2025-01-31 15:20:03.281106+00
6698	48179	f	\N	\N	2025-01-31 15:20:03.281106+00
6699	26366	f	\N	\N	2025-01-31 15:20:03.281106+00
6700	50225	f	\N	\N	2025-01-31 15:20:03.281106+00
6701	35349	f	\N	\N	2025-01-31 15:20:03.281106+00
6702	31541	f	\N	\N	2025-01-31 15:20:03.281106+00
6703	65791	f	\N	\N	2025-01-31 15:20:03.281106+00
6704	92257	f	\N	\N	2025-01-31 15:20:03.281106+00
6705	64965	f	\N	\N	2025-01-31 15:20:03.281106+00
6706	52207	f	\N	\N	2025-01-31 15:20:03.281106+00
6707	40825	f	\N	\N	2025-01-31 15:20:03.281106+00
6708	46288	f	\N	\N	2025-01-31 15:20:03.281106+00
6709	10363	f	\N	\N	2025-01-31 15:20:03.281106+00
6710	99125	f	\N	\N	2025-01-31 15:20:03.281106+00
6711	74684	f	\N	\N	2025-01-31 15:20:03.281106+00
6712	65925	f	\N	\N	2025-01-31 15:20:03.281106+00
6713	14619	f	\N	\N	2025-01-31 15:20:03.281106+00
6714	10096	f	\N	\N	2025-01-31 15:20:03.281106+00
6715	40325	f	\N	\N	2025-01-31 15:20:03.281106+00
6716	98760	f	\N	\N	2025-01-31 15:20:03.281106+00
6717	33311	f	\N	\N	2025-01-31 15:20:03.281106+00
6718	64260	f	\N	\N	2025-01-31 15:20:03.281106+00
6719	38537	f	\N	\N	2025-01-31 15:20:03.281106+00
6720	68582	f	\N	\N	2025-01-31 15:20:03.281106+00
6721	13778	f	\N	\N	2025-01-31 15:20:03.281106+00
6722	34903	f	\N	\N	2025-01-31 15:20:03.281106+00
6723	24246	f	\N	\N	2025-01-31 15:20:03.281106+00
6724	81271	f	\N	\N	2025-01-31 15:20:03.281106+00
6725	48949	f	\N	\N	2025-01-31 15:20:03.281106+00
6726	93823	f	\N	\N	2025-01-31 15:20:03.281106+00
6727	86461	f	\N	\N	2025-01-31 15:20:03.281106+00
6728	34329	f	\N	\N	2025-01-31 15:20:03.281106+00
6729	33650	f	\N	\N	2025-01-31 15:20:03.281106+00
6730	41105	f	\N	\N	2025-01-31 15:20:03.281106+00
6731	67625	f	\N	\N	2025-01-31 15:20:03.281106+00
6732	94561	f	\N	\N	2025-01-31 15:20:03.281106+00
6733	85896	f	\N	\N	2025-01-31 15:20:03.281106+00
6734	14282	f	\N	\N	2025-01-31 15:20:03.281106+00
6735	41632	f	\N	\N	2025-01-31 15:20:03.281106+00
6736	29798	f	\N	\N	2025-01-31 15:20:03.281106+00
6737	67898	f	\N	\N	2025-01-31 15:20:03.281106+00
6738	21179	f	\N	\N	2025-01-31 15:20:03.281106+00
6739	34183	f	\N	\N	2025-01-31 15:20:03.281106+00
6740	74730	f	\N	\N	2025-01-31 15:20:03.281106+00
6741	89755	f	\N	\N	2025-01-31 15:20:03.281106+00
6742	90653	f	\N	\N	2025-01-31 15:20:03.281106+00
6743	11550	f	\N	\N	2025-01-31 15:20:03.281106+00
6744	83833	f	\N	\N	2025-01-31 15:20:03.281106+00
6745	19460	f	\N	\N	2025-01-31 15:20:03.281106+00
6746	36641	f	\N	\N	2025-01-31 15:20:03.281106+00
6747	67092	f	\N	\N	2025-01-31 15:20:03.281106+00
6748	40676	f	\N	\N	2025-01-31 15:20:03.281106+00
6749	94811	f	\N	\N	2025-01-31 15:20:03.281106+00
6750	94346	f	\N	\N	2025-01-31 15:20:03.281106+00
6751	70770	f	\N	\N	2025-01-31 15:20:03.281106+00
6752	16975	f	\N	\N	2025-01-31 15:20:03.281106+00
6753	12966	f	\N	\N	2025-01-31 15:20:03.281106+00
6754	18619	f	\N	\N	2025-01-31 15:20:03.281106+00
6755	69409	f	\N	\N	2025-01-31 15:20:03.281106+00
6756	97914	f	\N	\N	2025-01-31 15:20:03.281106+00
6757	83606	f	\N	\N	2025-01-31 15:20:03.281106+00
6758	99641	f	\N	\N	2025-01-31 15:20:03.281106+00
6759	15656	f	\N	\N	2025-01-31 15:20:03.281106+00
6760	60112	f	\N	\N	2025-01-31 15:20:03.281106+00
6761	13260	f	\N	\N	2025-01-31 15:20:03.281106+00
6762	96441	f	\N	\N	2025-01-31 15:20:03.281106+00
6763	92193	f	\N	\N	2025-01-31 15:20:03.281106+00
6764	21654	f	\N	\N	2025-01-31 15:20:03.281106+00
6765	91831	f	\N	\N	2025-01-31 15:20:03.281106+00
6766	72617	f	\N	\N	2025-01-31 15:20:03.281106+00
6767	91502	f	\N	\N	2025-01-31 15:20:03.281106+00
6768	46140	f	\N	\N	2025-01-31 15:20:03.281106+00
6769	26898	f	\N	\N	2025-01-31 15:20:03.281106+00
6770	36084	f	\N	\N	2025-01-31 15:20:03.281106+00
6771	25284	f	\N	\N	2025-01-31 15:20:03.281106+00
6772	35602	f	\N	\N	2025-01-31 15:20:03.281106+00
6773	45721	f	\N	\N	2025-01-31 15:20:03.281106+00
6774	35871	f	\N	\N	2025-01-31 15:20:03.281106+00
6775	87616	f	\N	\N	2025-01-31 15:20:03.281106+00
6776	63275	f	\N	\N	2025-01-31 15:20:03.281106+00
6777	94512	f	\N	\N	2025-01-31 15:20:03.281106+00
6778	42570	f	\N	\N	2025-01-31 15:20:03.281106+00
6779	83762	f	\N	\N	2025-01-31 15:20:03.281106+00
6780	43305	f	\N	\N	2025-01-31 15:20:03.281106+00
6781	57337	f	\N	\N	2025-01-31 15:20:03.281106+00
6782	90853	f	\N	\N	2025-01-31 15:20:03.281106+00
6783	64774	f	\N	\N	2025-01-31 15:20:03.281106+00
6784	16726	f	\N	\N	2025-01-31 15:20:03.281106+00
6785	21059	f	\N	\N	2025-01-31 15:20:03.281106+00
6786	32616	f	\N	\N	2025-01-31 15:20:03.281106+00
6787	93976	f	\N	\N	2025-01-31 15:20:03.281106+00
6788	57269	f	\N	\N	2025-01-31 15:20:03.281106+00
6789	39260	f	\N	\N	2025-01-31 15:20:03.281106+00
6790	77122	f	\N	\N	2025-01-31 15:20:03.281106+00
6791	84555	f	\N	\N	2025-01-31 15:20:03.281106+00
6792	80168	f	\N	\N	2025-01-31 15:20:03.281106+00
6793	70796	f	\N	\N	2025-01-31 15:20:03.281106+00
6794	85252	f	\N	\N	2025-01-31 15:20:03.281106+00
6795	51249	f	\N	\N	2025-01-31 15:20:03.281106+00
6796	89292	f	\N	\N	2025-01-31 15:20:03.281106+00
6797	81566	f	\N	\N	2025-01-31 15:20:03.281106+00
6798	90327	f	\N	\N	2025-01-31 15:20:03.281106+00
6799	64808	f	\N	\N	2025-01-31 15:20:03.281106+00
6800	68897	f	\N	\N	2025-01-31 15:20:03.281106+00
6801	50865	f	\N	\N	2025-01-31 15:20:03.281106+00
6802	46245	f	\N	\N	2025-01-31 15:20:03.281106+00
6803	32249	f	\N	\N	2025-01-31 15:20:03.281106+00
6804	54771	f	\N	\N	2025-01-31 15:20:03.281106+00
6805	52159	f	\N	\N	2025-01-31 15:20:03.281106+00
6806	55841	f	\N	\N	2025-01-31 15:20:03.281106+00
6807	47041	f	\N	\N	2025-01-31 15:20:03.281106+00
6808	98135	f	\N	\N	2025-01-31 15:20:03.281106+00
6809	88772	f	\N	\N	2025-01-31 15:20:03.281106+00
6810	32608	f	\N	\N	2025-01-31 15:20:03.281106+00
6811	61187	f	\N	\N	2025-01-31 15:20:03.281106+00
6812	71043	f	\N	\N	2025-01-31 15:20:03.281106+00
6813	73356	f	\N	\N	2025-01-31 15:20:03.281106+00
6814	42786	f	\N	\N	2025-01-31 15:20:03.281106+00
6815	77119	f	\N	\N	2025-01-31 15:20:03.281106+00
6816	95827	f	\N	\N	2025-01-31 15:20:03.281106+00
6817	75510	f	\N	\N	2025-01-31 15:20:03.281106+00
6818	46373	f	\N	\N	2025-01-31 15:20:03.281106+00
6819	22413	f	\N	\N	2025-01-31 15:20:03.281106+00
6820	43578	f	\N	\N	2025-01-31 15:20:03.281106+00
6821	76865	f	\N	\N	2025-01-31 15:20:03.281106+00
6822	52135	f	\N	\N	2025-01-31 15:20:03.281106+00
6823	71212	f	\N	\N	2025-01-31 15:20:03.281106+00
6824	80447	f	\N	\N	2025-01-31 15:20:03.281106+00
6825	26001	f	\N	\N	2025-01-31 15:20:03.281106+00
6826	59367	f	\N	\N	2025-01-31 15:20:03.281106+00
6827	30200	f	\N	\N	2025-01-31 15:20:03.281106+00
6828	73160	f	\N	\N	2025-01-31 15:20:03.281106+00
6829	58719	f	\N	\N	2025-01-31 15:20:03.281106+00
6830	29229	f	\N	\N	2025-01-31 15:20:03.281106+00
6831	40836	f	\N	\N	2025-01-31 15:20:03.281106+00
6832	79604	f	\N	\N	2025-01-31 15:20:03.281106+00
6833	25841	f	\N	\N	2025-01-31 15:20:03.281106+00
6834	40650	f	\N	\N	2025-01-31 15:20:03.281106+00
6835	75850	f	\N	\N	2025-01-31 15:20:03.281106+00
6836	51566	f	\N	\N	2025-01-31 15:20:03.281106+00
6837	57818	f	\N	\N	2025-01-31 15:20:03.281106+00
6838	42097	f	\N	\N	2025-01-31 15:20:03.281106+00
6839	77146	f	\N	\N	2025-01-31 15:20:03.281106+00
6840	56988	f	\N	\N	2025-01-31 15:20:03.281106+00
6841	92076	f	\N	\N	2025-01-31 15:20:03.281106+00
6842	55329	f	\N	\N	2025-01-31 15:20:03.281106+00
6844	59308	f	\N	\N	2025-01-31 15:20:03.281106+00
6845	15461	f	\N	\N	2025-01-31 15:20:03.281106+00
6846	67348	f	\N	\N	2025-01-31 15:20:03.281106+00
6847	65347	f	\N	\N	2025-01-31 15:20:03.281106+00
6848	34835	f	\N	\N	2025-01-31 15:20:03.281106+00
6849	87925	f	\N	\N	2025-01-31 15:20:03.281106+00
6850	23168	f	\N	\N	2025-01-31 15:20:03.281106+00
6851	94510	f	\N	\N	2025-01-31 15:20:03.281106+00
6852	62894	f	\N	\N	2025-01-31 15:20:03.281106+00
6853	12525	f	\N	\N	2025-01-31 15:20:03.281106+00
6854	39627	f	\N	\N	2025-01-31 15:20:03.281106+00
6855	91225	f	\N	\N	2025-01-31 15:20:03.281106+00
6856	81436	f	\N	\N	2025-01-31 15:20:03.281106+00
6857	86926	f	\N	\N	2025-01-31 15:20:03.281106+00
6858	17302	f	\N	\N	2025-01-31 15:20:03.281106+00
6859	50072	f	\N	\N	2025-01-31 15:20:03.281106+00
6860	50175	f	\N	\N	2025-01-31 15:20:03.281106+00
6861	25506	f	\N	\N	2025-01-31 15:20:03.281106+00
6862	81340	f	\N	\N	2025-01-31 15:20:03.281106+00
6863	95033	f	\N	\N	2025-01-31 15:20:03.281106+00
6864	21696	f	\N	\N	2025-01-31 15:20:03.281106+00
6865	59930	f	\N	\N	2025-01-31 15:20:03.281106+00
6866	61261	f	\N	\N	2025-01-31 15:20:03.281106+00
6867	58803	f	\N	\N	2025-01-31 15:20:03.281106+00
6868	88224	f	\N	\N	2025-01-31 15:20:03.281106+00
6869	22721	f	\N	\N	2025-01-31 15:20:03.281106+00
6870	86772	f	\N	\N	2025-01-31 15:20:03.281106+00
6871	20853	f	\N	\N	2025-01-31 15:20:03.281106+00
6872	88893	f	\N	\N	2025-01-31 15:20:03.281106+00
6873	15451	f	\N	\N	2025-01-31 15:20:03.281106+00
6874	55822	f	\N	\N	2025-01-31 15:20:03.281106+00
6875	23484	f	\N	\N	2025-01-31 15:20:03.281106+00
6876	43113	f	\N	\N	2025-01-31 15:20:03.281106+00
6877	22823	f	\N	\N	2025-01-31 15:20:03.281106+00
6878	42599	f	\N	\N	2025-01-31 15:20:03.281106+00
6879	70781	f	\N	\N	2025-01-31 15:20:03.281106+00
6880	56706	f	\N	\N	2025-01-31 15:20:03.281106+00
6881	53662	f	\N	\N	2025-01-31 15:20:03.281106+00
6882	99865	f	\N	\N	2025-01-31 15:20:03.281106+00
6883	24928	f	\N	\N	2025-01-31 15:20:03.281106+00
6884	84341	f	\N	\N	2025-01-31 15:20:03.281106+00
6885	37812	f	\N	\N	2025-01-31 15:20:03.281106+00
6886	87683	f	\N	\N	2025-01-31 15:20:03.281106+00
6887	55969	f	\N	\N	2025-01-31 15:20:03.281106+00
6888	71846	f	\N	\N	2025-01-31 15:20:03.281106+00
6889	44632	f	\N	\N	2025-01-31 15:20:03.281106+00
6890	79572	f	\N	\N	2025-01-31 15:20:03.281106+00
6891	26693	f	\N	\N	2025-01-31 15:20:03.281106+00
6892	65000	f	\N	\N	2025-01-31 15:20:03.281106+00
6893	22080	f	\N	\N	2025-01-31 15:20:03.281106+00
6894	10820	f	\N	\N	2025-01-31 15:20:03.281106+00
6895	67063	f	\N	\N	2025-01-31 15:20:03.281106+00
6896	93865	f	\N	\N	2025-01-31 15:20:03.281106+00
6897	16079	f	\N	\N	2025-01-31 15:20:03.281106+00
6898	66378	f	\N	\N	2025-01-31 15:20:03.281106+00
6899	71275	f	\N	\N	2025-01-31 15:20:03.281106+00
6900	19157	f	\N	\N	2025-01-31 15:20:03.281106+00
6901	91311	f	\N	\N	2025-01-31 15:20:03.281106+00
6902	40010	f	\N	\N	2025-01-31 15:20:03.281106+00
6903	99899	f	\N	\N	2025-01-31 15:20:03.281106+00
6904	46041	f	\N	\N	2025-01-31 15:20:03.281106+00
6905	46529	f	\N	\N	2025-01-31 15:20:03.281106+00
6906	30877	f	\N	\N	2025-01-31 15:20:03.281106+00
6907	60945	f	\N	\N	2025-01-31 15:20:03.281106+00
6908	18786	f	\N	\N	2025-01-31 15:20:03.281106+00
6909	53068	f	\N	\N	2025-01-31 15:20:03.281106+00
6910	68973	f	\N	\N	2025-01-31 15:20:03.281106+00
6911	66040	f	\N	\N	2025-01-31 15:20:03.281106+00
6912	74207	f	\N	\N	2025-01-31 15:20:03.281106+00
6913	37904	f	\N	\N	2025-01-31 15:20:03.281106+00
6914	18197	f	\N	\N	2025-01-31 15:20:03.281106+00
6915	54858	f	\N	\N	2025-01-31 15:20:03.281106+00
6916	76685	f	\N	\N	2025-01-31 15:20:03.281106+00
6917	72401	f	\N	\N	2025-01-31 15:20:03.281106+00
6918	47003	f	\N	\N	2025-01-31 15:20:03.281106+00
6919	53103	f	\N	\N	2025-01-31 15:20:03.281106+00
6920	60382	f	\N	\N	2025-01-31 15:20:03.281106+00
6921	80714	f	\N	\N	2025-01-31 15:20:03.281106+00
6922	84160	f	\N	\N	2025-01-31 15:20:03.281106+00
6923	39171	f	\N	\N	2025-01-31 15:20:03.281106+00
6924	38565	f	\N	\N	2025-01-31 15:20:03.281106+00
6925	30880	f	\N	\N	2025-01-31 15:20:03.281106+00
6926	57365	f	\N	\N	2025-01-31 15:20:03.281106+00
6927	50635	f	\N	\N	2025-01-31 15:20:03.281106+00
6928	99190	f	\N	\N	2025-01-31 15:20:03.281106+00
6929	77912	f	\N	\N	2025-01-31 15:20:03.281106+00
6930	83319	f	\N	\N	2025-01-31 15:20:03.281106+00
6931	64219	f	\N	\N	2025-01-31 15:20:03.281106+00
6932	16880	f	\N	\N	2025-01-31 15:20:03.281106+00
6933	46062	f	\N	\N	2025-01-31 15:20:03.281106+00
6934	69651	f	\N	\N	2025-01-31 15:20:03.281106+00
6935	26970	f	\N	\N	2025-01-31 15:20:03.281106+00
6936	39219	f	\N	\N	2025-01-31 15:20:03.281106+00
6937	65847	f	\N	\N	2025-01-31 15:20:03.281106+00
6938	50738	f	\N	\N	2025-01-31 15:20:03.281106+00
6939	17661	f	\N	\N	2025-01-31 15:20:03.281106+00
6940	95391	f	\N	\N	2025-01-31 15:20:03.281106+00
6941	60616	f	\N	\N	2025-01-31 15:20:03.281106+00
6942	92175	f	\N	\N	2025-01-31 15:20:03.281106+00
6943	78905	f	\N	\N	2025-01-31 15:20:03.281106+00
6944	41649	f	\N	\N	2025-01-31 15:20:03.281106+00
6945	78208	f	\N	\N	2025-01-31 15:20:03.281106+00
6946	96820	f	\N	\N	2025-01-31 15:20:03.281106+00
6947	85203	f	\N	\N	2025-01-31 15:20:03.281106+00
6948	26904	f	\N	\N	2025-01-31 15:20:03.281106+00
6949	32122	f	\N	\N	2025-01-31 15:20:03.281106+00
6950	71672	f	\N	\N	2025-01-31 15:20:03.281106+00
6951	16149	f	\N	\N	2025-01-31 15:20:03.281106+00
6952	21852	f	\N	\N	2025-01-31 15:20:03.281106+00
6953	81371	f	\N	\N	2025-01-31 15:20:03.281106+00
6954	56972	f	\N	\N	2025-01-31 15:20:03.281106+00
6955	29225	f	\N	\N	2025-01-31 15:20:03.281106+00
6956	45932	f	\N	\N	2025-01-31 15:20:03.281106+00
6957	34897	f	\N	\N	2025-01-31 15:20:03.281106+00
6958	87022	f	\N	\N	2025-01-31 15:20:03.281106+00
6959	30538	f	\N	\N	2025-01-31 15:20:03.281106+00
6960	85946	f	\N	\N	2025-01-31 15:20:03.281106+00
6961	81329	f	\N	\N	2025-01-31 15:20:03.281106+00
6962	82821	f	\N	\N	2025-01-31 15:20:03.281106+00
6963	84742	f	\N	\N	2025-01-31 15:20:03.281106+00
6964	53837	f	\N	\N	2025-01-31 15:20:03.281106+00
6965	17271	f	\N	\N	2025-01-31 15:20:03.281106+00
6966	93539	f	\N	\N	2025-01-31 15:20:03.281106+00
6967	71751	f	\N	\N	2025-01-31 15:20:03.281106+00
6968	68775	f	\N	\N	2025-01-31 15:20:03.281106+00
6969	80059	f	\N	\N	2025-01-31 15:20:03.281106+00
6970	39964	f	\N	\N	2025-01-31 15:20:03.281106+00
6971	84287	f	\N	\N	2025-01-31 15:20:03.281106+00
6972	44595	f	\N	\N	2025-01-31 15:20:03.281106+00
6973	81480	f	\N	\N	2025-01-31 15:20:03.281106+00
6974	83686	f	\N	\N	2025-01-31 15:20:03.281106+00
6975	71589	f	\N	\N	2025-01-31 15:20:03.281106+00
6976	66577	f	\N	\N	2025-01-31 15:20:03.281106+00
6977	14902	f	\N	\N	2025-01-31 15:20:03.281106+00
6978	72595	f	\N	\N	2025-01-31 15:20:03.281106+00
6979	26167	f	\N	\N	2025-01-31 15:20:03.281106+00
6980	76486	f	\N	\N	2025-01-31 15:20:03.281106+00
6981	54410	f	\N	\N	2025-01-31 15:20:03.281106+00
6982	75890	f	\N	\N	2025-01-31 15:20:03.281106+00
6983	32857	f	\N	\N	2025-01-31 15:20:03.281106+00
6984	88130	f	\N	\N	2025-01-31 15:20:03.281106+00
6985	57312	f	\N	\N	2025-01-31 15:20:03.281106+00
6986	15389	f	\N	\N	2025-01-31 15:20:03.281106+00
6987	59598	f	\N	\N	2025-01-31 15:20:03.281106+00
6988	16996	f	\N	\N	2025-01-31 15:20:03.281106+00
6989	91098	f	\N	\N	2025-01-31 15:20:03.281106+00
6990	74740	f	\N	\N	2025-01-31 15:20:03.281106+00
6991	12423	f	\N	\N	2025-01-31 15:20:03.281106+00
6992	69499	f	\N	\N	2025-01-31 15:20:03.281106+00
6993	11764	f	\N	\N	2025-01-31 15:20:03.281106+00
6994	84521	f	\N	\N	2025-01-31 15:20:03.281106+00
6995	72572	f	\N	\N	2025-01-31 15:20:03.281106+00
6996	32017	f	\N	\N	2025-01-31 15:20:03.281106+00
6997	81932	f	\N	\N	2025-01-31 15:20:03.281106+00
6998	71961	f	\N	\N	2025-01-31 15:20:03.281106+00
6999	64098	f	\N	\N	2025-01-31 15:20:03.281106+00
7000	20776	f	\N	\N	2025-01-31 15:20:03.281106+00
7001	59158	f	\N	\N	2025-01-31 15:20:03.281106+00
7002	98685	f	\N	\N	2025-01-31 15:20:03.281106+00
7003	59792	f	\N	\N	2025-01-31 15:20:03.281106+00
6005	41292	t	2025-02-01 11:04:03.908+00	\N	2025-01-31 15:20:03.281106+00
6006	64148	t	2025-02-01 11:04:03.908+00	\N	2025-01-31 15:20:03.281106+00
6007	42890	t	2025-02-01 11:04:03.908+00	\N	2025-01-31 15:20:03.281106+00
6010	98374	t	2025-02-04 18:20:30.062+00	85	2025-01-31 15:20:03.281106+00
6004	81090	t	2025-02-01 10:28:27.273+00	\N	2025-01-31 15:20:03.281106+00
\.


--
-- Data for Name: bounce_history; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.bounce_history (id, subscriber_id, newsletter_id, bounce_type, bounce_category, created_at) FROM stdin;
\.


--
-- Data for Name: credit_purchases; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.credit_purchases (id, user_id, package_id, credits_amount, price_paid, currency, stripe_session_id, stripe_payment_intent_id, status, created_at, completed_at) FROM stdin;
1	85	credits-100	100	1000	usd	cs_test_a18DXSbAkM1DMR0musGmUzqCmVSNuWXa6yjQb5cFoNQ2LwE62xUrprlYW0	\N	pending	2025-02-04 18:51:02.459043+00	\N
2	85	credits-100	100	1000	usd	cs_test_a1KaHQ5bVFocPNn3OWVmBFG4EPT10hEN0YQWDnCckEtI5AMwSXgAisE6lK	\N	pending	2025-02-05 11:07:23.028818+00	\N
3	85	credits-100	100	1000	usd	cs_test_a1hXlwQLqZLIQJDj6AGWxQP3r3l6ZEZEsgKPWktIF7diZM0PyJEJMEoI2U	\N	pending	2025-02-05 11:22:58.989574+00	\N
4	86	credits-100	100	1000	usd	cs_test_a1imcj68WU5dl6CFJ5fTyNTBLA9aYYrF66Zbmzu2M3phD1Fax0pNugZiZA	\N	pending	2025-02-05 11:33:15.889452+00	\N
5	86	credits-100	100	1000	usd	cs_test_a1N76M84rhsH4YCr6Yx5IotV1FS5T6QAVyYZxBRvj7mmHIr9X507eduVvs	\N	pending	2025-02-05 18:25:13.30343+00	\N
6	85	credits-100	100	1000	usd	cs_test_a1hipH2M9nln3Sdz7JQJOCUncAlHMHwYw3MbCdUXr7QeielYitqFEuMlIR	\N	pending	2025-02-05 19:36:20.367543+00	\N
7	85	credits-100	100	1000	usd	cs_test_a1bz3i438qxxlp6JkbH215JKszcmclTh6oMurpavULAMlrjbtuN3VfXsi6	\N	pending	2025-02-05 19:53:36.129041+00	\N
8	85	credits-100	100	1000	usd	cs_test_a1Fu60LfN3TcpXZNPlee703WOhGYqkfhW6PqFZStozd88GmSvN2Yplx74J	\N	pending	2025-02-05 20:00:01.712291+00	\N
9	85	credits-300	300	2500	usd	cs_test_a1Yl6rfFbrKqa93h6y5QsUWOcd0TBzTWOKbIGHA2d0yFFpQQkVCamptt5f	\N	pending	2025-02-05 20:05:01.222294+00	\N
10	85	credits-100	100	1000	usd	cs_test_a1eQjqhpiBn2Yzrk5bLT3fqy4Q0OJK92YnPIygTTwiNwsOBx8yvGFU1tLK	\N	pending	2025-02-06 07:48:04.084229+00	\N
11	85	credits-1000	1000	7500	usd	cs_test_a1YgSrNqcjopknHx979Faoi8HTgIf1KuxbJJGpgqY9PQnRSN2aKd4JZjAC	\N	pending	2025-02-06 08:02:46.512657+00	\N
12	85	credits-300	300	2500	usd	cs_test_a1ALrH6Zg5rMg4AjyNSYaqEiu63LDJEGkNLKrMWFt9Fz7pAua2mpvlMA8c	\N	pending	2025-02-06 08:09:11.331992+00	\N
13	85	credits-100	100	1000	usd	cs_test_a1gvdD0t8QSuA9m2JShke0xWG0n1KOa3DLqE97PrBp4Id9gdvr48TmR94L	\N	pending	2025-02-06 08:16:24.433279+00	\N
15	85	credits-300	300	2500	usd	cs_test_a1cuwQbUwXoMVPSFi4OcHVpmK3IeQeiylMmvZBniBdKOF8OQ0IBrHNhwgv	\N	pending	2025-02-06 09:51:49.929172+00	\N
16	85	credits-1000	1000	7500	usd	cs_test_a1m9oSDpecOAejl1DuGWcuEJh4zZv9ZFqLrP9cPdUSznVVLgAuupfHdbah	\N	pending	2025-02-06 10:49:59.553428+00	\N
17	85	credits-100	100	1000	usd	cs_test_a1JTqQUgdc9lY6iKSOSYDaSFDenmOQvwVTdhn1dpZbSfWvlGTaPUr4e4qF	\N	pending	2025-02-06 11:37:18.528273+00	\N
31	85	credits-100	100	1000	usd	cs_test_a1VgRq4SlzKPj4GuQz7NAnkjfEFebuNtzGsvsPQFejG2LrLi0soOP9kAb7	pi_3QpaeXP33CWCiQss1JRsbNBa	completed	2025-02-06 19:21:54.597685+00	2025-02-06 19:22:23.542+00
32	85	credits-100	100	1000	usd	cs_test_a1tdioQS927pXNvLGfJLXOSUxzXwpoW9Rsdtni006Rr7FfQDonJt16WlFt	pi_3QppWjP33CWCiQss0sONb3Gx	completed	2025-02-07 11:14:21.555568+00	2025-02-07 11:15:19.134+00
33	85	credits-1000	1000	7500	usd	cs_test_a1ZklhvopO27BLxMKI7LpfHyfXI26xALa9CRxReWxXX7fo9tbeRhKB4Kef	pi_3QptIoP33CWCiQss1cKmwkb0	completed	2025-02-07 15:16:33.95349+00	2025-02-07 15:17:11.88+00
34	9	credits-100	100	1000	usd	cs_test_a1mpru1MhxiAMn5mReCGppovRgHJMtgrk3UWtYGMYYYdH14N11i7aJdkkN	\N	pending	2025-02-16 12:03:47.77949+00	\N
35	9	credits-300	300	2500	usd	cs_test_a1oGKkPPtL0kPJ087vrzorgDLFxnN6BiIKd0UKvqU1HpC0jmOksJoiaJWf	\N	pending	2025-02-16 12:03:49.280315+00	\N
36	85	credits-100	100	1000	usd	cs_test_a149cBwIIM3O3xOY8NbN4YEiLSsyq7vAzTrNplkGab3i8cusH3uyztWqwH	\N	pending	2025-02-17 17:49:41.22382+00	\N
37	85	credits-300	300	2500	usd	cs_test_a1riufzz5XfNsOwbDNHRWHBQFxmnitiErzc2t9D09WNo8WCK1A8C0aI3br	\N	pending	2025-02-17 17:53:26.07382+00	\N
39	85	credits-100	100	1000	usd	cs_test_a1EuViB4fWtYwIFJ63y0kEG3nnLmnQrw7U6R3yQ2bPB9RPo9ELqWMDWEo1	\N	pending	2025-02-19 08:13:17.731792+00	\N
40	85	credits-100	100	1000	usd	cs_test_a1HxJR4gQ4DHnnwz4O40z3JFEaDJmpYWy6MBbt3umMPp26NI2Ly0ruzJjJ	\N	pending	2025-02-19 08:20:12.475809+00	\N
42	85	credits-100	100	1000	usd	cs_test_a1Mtz7CTr1AlJ6jK6kiabfpQubzGio1cmXrVX6sKRILK1r7wgbGzPT8l6W	\N	pending	2025-02-24 09:54:22.497689+00	\N
44	85	credits-300	300	2500	usd	cs_test_a1S0mBKpZAgSAtW40s7X6b06Ijp7zjwh8cmp8DmUyUtx5kma4vodFdEgjN	\N	pending	2025-02-25 08:48:27.360169+00	\N
45	85	credits-100	100	1000	usd	cs_test_a1pcHemdqZ3PL3FY8vEzCY7NioBKvutKwTQwMAon9NGibLKiwDRBwuWE7C	\N	pending	2025-02-25 10:06:01.784425+00	\N
47	85	credits-100	100	1000	usd	cs_test_a14Cz5Zx1FpmclPBahDP8OAtKewETdwwg0VgDv2FcMeh7mbeT09hhXMKos	\N	pending	2025-03-05 06:32:44.161804+00	\N
48	131	credits-100	100	1000	usd	cs_test_a114fAFo8Qn1JfYBDEmJ7FqDt77z09X5hPNjDIUgmFM6kDLDoHT905HhsO	\N	pending	2025-03-05 11:11:05.269061+00	\N
49	85	credits-100	100	1000	usd	cs_test_a1pWu8OPulyaE7jAULcEuHI5s7YMoWZwdvYlzCSHnXYWFX0q6zbJKWCJ7o	\N	pending	2025-03-05 11:28:58.177055+00	\N
50	85	credits-100	100	1000	usd	cs_test_a1SdSTHZpMEFoPdqOk8yhRmWHNP8NI1X6oEvsdy45KZGSDyF7wGP3HRFl0	\N	pending	2025-03-05 12:03:27.155507+00	\N
51	85	credits-100	100	1000	usd	cs_test_a14teTRLh4Eo9syxZOLKiUU1x7ZLOwlcs2jS1E7PD2kiJdDPT7cfal5xSV	\N	pending	2025-03-05 16:04:46.817094+00	\N
\.


--
-- Data for Name: credit_transactions; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.credit_transactions (id, user_id, amount, credits_before, credits_after, type, action, description, created_at) FROM stdin;
9	85	-1	500	499	use	edit_newsletter	Edited newsletter content	2025-02-04 18:37:35.490506+00
10	86	-1	500	499	use	edit_newsletter	Edited newsletter content	2025-02-05 11:35:07.131984+00
11	86	-1	499	498	use	edit_newsletter	Edited newsletter content	2025-02-05 11:35:55.7778+00
12	86	-1	498	497	use	generate_newsletter	Generated newsletter content	2025-02-05 11:39:47.982523+00
13	86	-1	497	496	use	edit_newsletter	Edited newsletter content	2025-02-05 17:41:44.204222+00
14	86	-1	496	495	use	generate_newsletter	Generated newsletter content	2025-02-05 17:49:05.487671+00
15	86	-1	495	494	use	generate_newsletter	Generated newsletter content	2025-02-05 17:56:50.926733+00
16	86	-1	494	493	use	generate_newsletter	Generated newsletter content	2025-02-05 17:57:41.772412+00
17	86	-1	493	492	use	generate_newsletter	Generated newsletter content	2025-02-05 18:05:36.051589+00
18	86	-1	492	491	use	generate_newsletter	Generated newsletter content	2025-02-05 18:07:29.28522+00
19	86	-1	491	490	use	generate_newsletter	Generated newsletter content	2025-02-05 18:10:01.929705+00
20	86	-1	490	489	use	generate_newsletter	Generated newsletter content	2025-02-05 18:11:02.197949+00
27	85	100	499	599	add	credit_purchase	Purchased 100 credits	2025-02-06 19:22:23.527371+00
28	85	-1	599	598	use	generate_newsletter	Generated newsletter content	2025-02-06 19:22:57.690295+00
29	85	-1	598	597	use	generate_newsletter	Generated newsletter content	2025-02-06 19:23:27.899515+00
30	85	-1	597	596	use	generate_newsletter	Generated newsletter content	2025-02-06 19:26:03.542739+00
31	85	-1	596	595	use	generate_newsletter	Generated newsletter content	2025-02-06 19:26:30.830188+00
32	85	-1	595	594	use	generate_newsletter	Generated newsletter content	2025-02-06 19:26:53.496197+00
33	85	100	594	694	add	credit_purchase	Purchased 100 credits	2025-02-07 11:15:19.119652+00
34	85	1000	694	1694	add	credit_purchase	Purchased 1000 credits	2025-02-07 15:17:11.866944+00
35	85	-1	1694	1693	use	generate_newsletter	Generated newsletter content	2025-02-07 15:18:16.829367+00
36	85	-1	1693	1692	use	send_newsletter	Sent newsletter	2025-02-14 10:56:54.865718+00
37	85	-1	1692	1691	use	generate_newsletter	Generated newsletter content	2025-02-20 11:54:54.230375+00
38	85	-1	1691	1690	use	generate_newsletter	Generated newsletter content	2025-02-20 17:51:29.159702+00
39	85	-1	1690	1689	use	generate_newsletter	Generated newsletter content	2025-02-20 17:54:37.007991+00
40	85	-1	1689	1688	use	generate_newsletter	Generated newsletter content	2025-02-20 18:00:05.05289+00
41	85	-1	1688	1687	use	generate_newsletter	Generated newsletter content	2025-02-20 18:04:17.276393+00
44	85	-1	1687	1686	use	generate_newsletter	Generated newsletter content	2025-02-27 16:08:48.880939+00
45	85	-1	1686	1685	use	generate_newsletter	Generated newsletter content	2025-02-27 16:09:29.865179+00
46	85	-1	1685	1684	use	generate_newsletter	Generated newsletter content	2025-02-27 16:10:46.590425+00
47	85	-1	1684	1683	use	generate_newsletter	Generated newsletter content	2025-02-27 16:11:53.640806+00
59	130	50	0	50	initialize	subscription_activation	Initial credits for starter tier	2025-03-02 20:27:09.899388+00
60	131	50	0	50	initialize	subscription_activation	Initial credits for starter tier	2025-03-03 07:24:19.109153+00
61	85	-1	1683	1682	use	generate_newsletter	Generated newsletter content	2025-03-05 13:08:09.870263+00
62	85	-1	1682	1681	use	generate_newsletter	Generated newsletter content	2025-03-23 09:50:33.657873+00
63	85	-1	1681	1680	use	generate_newsletter	Generated newsletter content	2025-03-23 09:51:10.101811+00
64	85	-1	1680	1679	use	generate_newsletter	Generated newsletter content	2025-03-23 09:53:41.967901+00
65	85	-1	1679	1678	use	generate_newsletter	Generated newsletter content	2025-03-23 11:04:52.111991+00
66	85	-1	1678	1677	use	generate_newsletter	Generated newsletter content	2025-03-23 11:10:37.99571+00
67	85	-1	1677	1676	use	generate_newsletter	Generated newsletter content	2025-03-23 11:12:58.680189+00
68	85	-1	1676	1675	use	generate_newsletter	Generated styled newsletter content	2025-03-23 14:50:56.282397+00
69	85	-1	1675	1674	use	generate_newsletter	Generated styled newsletter content	2025-03-23 14:51:57.914125+00
70	85	-1	1674	1673	use	generate_newsletter	Generated styled newsletter content	2025-03-23 14:52:27.38606+00
71	85	-1	1673	1672	use	generate_newsletter	Generated styled newsletter content	2025-03-23 15:04:58.859348+00
72	85	-1	1672	1671	use	generate_newsletter	Generated styled newsletter content	2025-03-23 15:05:35.937735+00
73	85	-1	1671	1670	use	generate_newsletter	Generated styled newsletter content	2025-03-23 15:11:17.867348+00
74	85	-1	1670	1669	use	generate_newsletter	Generated styled newsletter content	2025-03-23 15:12:30.574217+00
75	85	-1	1669	1668	use	generate_newsletter	Generated styled newsletter content	2025-03-23 15:26:58.905125+00
76	85	-1	1668	1667	use	generate_newsletter	Generated styled newsletter content	2025-03-23 15:28:24.162586+00
77	85	-1	1667	1666	use	generate_newsletter	Generated styled newsletter content	2025-03-23 15:30:12.008278+00
78	85	-1	1666	1665	use	generate_newsletter	Generated newsletter content	2025-03-23 16:10:30.476708+00
79	85	-1	1665	1664	use	generate_newsletter	Generated newsletter content	2025-03-23 16:35:16.992326+00
80	85	-1	1664	1663	use	generate_newsletter	Generated newsletter content	2025-03-23 16:48:10.375321+00
81	85	-1	1663	1662	use	generate_newsletter	Generated newsletter content	2025-03-23 17:21:49.158598+00
82	85	-1	1662	1661	use	generate_newsletter	Generated newsletter content	2025-03-23 17:24:27.45807+00
83	85	-1	1661	1660	use	generate_newsletter	Generated newsletter content	2025-03-23 18:45:25.900619+00
84	85	-1	1660	1659	use	generate_newsletter	Generated newsletter content	2025-03-23 18:47:42.582377+00
85	85	-1	1659	1658	use	generate_newsletter	Generated newsletter content	2025-03-23 18:49:10.828222+00
86	85	-1	1658	1657	use	generate_newsletter	Generated newsletter content	2025-03-23 19:00:53.883649+00
87	85	-1	1657	1656	use	generate_newsletter	Generated newsletter content	2025-03-23 19:01:43.597984+00
88	85	-1	1656	1655	use	generate_newsletter	Generated newsletter content	2025-03-23 19:02:50.708648+00
89	85	-1	1655	1654	use	generate_newsletter	Generated newsletter content	2025-03-23 19:07:06.821065+00
90	85	-1	1654	1653	use	generate_newsletter	Generated newsletter content	2025-03-23 19:19:06.516645+00
91	85	-1	1653	1652	use	generate_newsletter	Generated newsletter content	2025-03-23 19:20:01.443734+00
92	85	-1	1652	1651	use	generate_newsletter	Generated newsletter content	2025-03-23 19:22:23.150753+00
93	85	-1	1651	1650	use	generate_newsletter	Generated newsletter content	2025-03-23 19:23:14.303855+00
94	85	-1	1650	1649	use	generate_newsletter	Generated newsletter content	2025-03-23 19:42:41.036521+00
95	85	-1	1649	1648	use	generate_newsletter	Generated newsletter content	2025-03-23 19:43:54.548364+00
96	85	-1	1648	1647	use	generate_newsletter	Generated newsletter content	2025-03-23 19:45:39.687455+00
97	85	-1	1647	1646	use	generate_newsletter	Generated newsletter content	2025-03-23 19:47:28.552028+00
98	85	-1	1646	1645	use	generate_newsletter	Generated newsletter content	2025-03-23 20:41:46.087336+00
99	85	-1	1645	1644	use	generate_newsletter	Generated newsletter content	2025-03-23 20:50:53.295551+00
100	85	-1	1644	1643	use	generate_newsletter	Generated newsletter content	2025-03-23 21:08:55.802289+00
101	85	-1	1643	1642	use	generate_newsletter	Generated newsletter content	2025-03-24 04:51:50.534888+00
102	85	-1	1642	1641	use	generate_newsletter	Generated newsletter content	2025-03-24 05:17:23.633873+00
103	85	-1	1641	1640	use	generate_newsletter	Generated newsletter content	2025-03-24 05:24:01.220366+00
104	85	-1	1640	1639	use	generate_newsletter	Generated newsletter content	2025-03-24 05:36:21.63681+00
105	85	-1	1639	1638	use	generate_newsletter	Generated newsletter content	2025-03-24 06:05:21.079+00
106	85	-1	1638	1637	use	generate_newsletter	Generated newsletter content	2025-03-24 06:08:50.285512+00
107	85	-1	1637	1636	use	generate_newsletter	Generated newsletter content	2025-03-24 06:09:19.512442+00
108	85	-1	1636	1635	use	generate_newsletter	Generated newsletter content	2025-03-24 09:30:42.772882+00
109	85	-1	1635	1634	use	generate_newsletter	Generated newsletter content	2025-03-24 09:41:15.73233+00
110	85	-1	1634	1633	use	generate_newsletter	Generated newsletter content	2025-03-24 09:43:26.606038+00
111	85	-1	1633	1632	use	generate_newsletter	Generated newsletter content	2025-03-24 10:32:57.924465+00
112	85	-1	1632	1631	use	generate_newsletter	Generated newsletter content	2025-03-24 10:41:27.197316+00
113	85	-1	1631	1630	use	generate_newsletter	Generated newsletter content	2025-03-24 10:42:24.308153+00
114	85	-1	1630	1629	use	generate_newsletter	Generated newsletter content	2025-03-24 10:44:58.248133+00
115	85	-1	1629	1628	use	generate_newsletter	Generated newsletter content	2025-03-24 10:51:02.178133+00
116	85	-1	1628	1627	use	generate_newsletter	Generated newsletter content	2025-03-24 10:52:20.999992+00
117	85	-1	1627	1626	use	generate_newsletter	Generated newsletter content	2025-03-24 10:54:28.463152+00
118	85	-1	1626	1625	use	generate_newsletter	Generated newsletter content	2025-03-24 10:55:22.115371+00
119	85	-1	1625	1624	use	generate_newsletter	Generated newsletter content	2025-03-24 10:56:11.230599+00
120	85	-1	1624	1623	use	generate_newsletter	Generated newsletter content	2025-03-24 11:01:44.93366+00
121	85	-1	1623	1622	use	generate_newsletter	Generated newsletter content	2025-03-24 11:02:32.249535+00
122	85	-1	1622	1621	use	generate_newsletter	Generated newsletter content	2025-03-24 11:02:50.362653+00
123	85	-1	1621	1620	use	generate_newsletter	Generated newsletter content	2025-03-24 11:03:36.133757+00
124	85	-1	1620	1619	use	generate_newsletter	Generated newsletter content	2025-03-24 11:03:54.375672+00
125	85	-1	1619	1618	use	generate_newsletter	Generated newsletter content	2025-03-24 11:04:50.891674+00
126	85	-1	1618	1617	use	generate_newsletter	Generated newsletter content	2025-03-24 11:13:02.716978+00
127	85	-1	1617	1616	use	generate_newsletter	Generated newsletter content	2025-03-24 11:16:40.873856+00
128	85	-1	1616	1615	use	generate_newsletter	Generated newsletter content	2025-03-24 11:20:57.775055+00
129	85	-1	1615	1614	use	generate_newsletter	Generated newsletter content	2025-03-24 11:27:49.518318+00
130	85	-1	1614	1613	use	generate_newsletter	Generated newsletter content	2025-03-24 11:28:18.80642+00
131	85	-1	1613	1612	use	generate_newsletter	Generated newsletter content	2025-03-24 11:28:48.472245+00
132	85	-1	1612	1611	use	generate_newsletter	Generated newsletter content	2025-03-24 11:29:11.390286+00
133	85	-1	1611	1610	use	generate_newsletter	Generated newsletter content	2025-03-24 11:29:32.518734+00
134	85	-1	1610	1609	use	generate_newsletter	Generated newsletter content	2025-03-24 11:30:53.490531+00
135	85	-1	1609	1608	use	generate_newsletter	Generated newsletter content	2025-03-24 11:31:13.123395+00
136	85	-1	1608	1607	use	generate_newsletter	Generated newsletter content	2025-03-24 11:31:32.035454+00
137	85	-1	1607	1606	use	generate_newsletter	Generated newsletter content	2025-03-24 11:31:55.015563+00
138	85	-1	1606	1605	use	generate_newsletter	Generated newsletter content	2025-03-24 11:32:33.133134+00
139	85	-1	1605	1604	use	generate_newsletter	Generated newsletter content	2025-03-24 11:32:51.432987+00
140	85	-1	1604	1603	use	generate_newsletter	Generated newsletter content	2025-03-24 11:34:29.20516+00
141	85	-1	1603	1602	use	generate_newsletter	Generated newsletter content	2025-03-24 11:34:51.762642+00
142	85	-1	1602	1601	use	generate_newsletter	Generated newsletter content	2025-03-24 11:37:09.816005+00
143	85	-1	1601	1600	use	generate_newsletter	Generated newsletter content	2025-03-24 11:41:32.451633+00
144	85	-1	1600	1599	use	generate_newsletter	Generated newsletter content	2025-03-24 11:42:48.305177+00
145	85	-1	1599	1598	use	generate_newsletter	Generated newsletter content	2025-03-24 11:43:08.289359+00
146	85	-1	1598	1597	use	generate_newsletter	Generated newsletter content	2025-03-24 11:43:29.592765+00
147	85	-1	1597	1596	use	generate_newsletter	Generated newsletter content	2025-03-24 11:49:39.297887+00
148	85	-1	1596	1595	use	generate_newsletter	Generated newsletter content	2025-03-24 11:50:44.134857+00
149	85	-1	1595	1594	use	generate_newsletter	Generated newsletter content	2025-03-24 11:56:35.258512+00
150	85	-1	1594	1593	use	generate_newsletter	Generated newsletter content	2025-03-24 11:57:50.331258+00
151	85	-1	1593	1592	use	generate_newsletter	Generated newsletter content	2025-03-24 12:54:36.369199+00
152	85	-1	1592	1591	use	generate_newsletter	Generated newsletter content	2025-03-24 14:32:06.184361+00
153	85	-1	1591	1590	use	generate_newsletter	Generated newsletter content	2025-03-24 14:35:29.423024+00
154	137	50	0	50	initialize	subscription_activation	Initial credits for starter tier	2025-03-26 07:48:42.131739+00
156	139	50	0	50	initialize	subscription_activation	Initial credits for starter tier	2025-03-26 19:56:45.662087+00
157	140	50	0	50	initialize	subscription_activation	Initial credits for starter tier	2025-03-27 12:33:20.899866+00
158	140	-1	50	49	use	generate_newsletter	Generated newsletter content	2025-03-27 12:38:00.309063+00
159	141	50	0	50	initialize	subscription_activation	Initial credits for starter tier	2025-03-27 13:00:23.931119+00
\.


--
-- Data for Name: email_bounces; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.email_bounces (id, newsletter_id, email, bounce_type, bounce_category, diagnostic_code, created_at) FROM stdin;
\.


--
-- Data for Name: email_events; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.email_events (id, newsletter_id, email, event_type, occurred_at, metadata) FROM stdin;
\.


--
-- Data for Name: email_retries; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.email_retries (id, newsletter_id, recipient_email, attempt_count, last_error, last_attempt_at, next_attempt_at, status, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: email_tracking; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.email_tracking (id, newsletter_id, recipient_email, event_type, event_timestamp, user_agent, ip_address, link_url) FROM stdin;
\.


--
-- Data for Name: form_styles; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.form_styles (id, user_id, styles, content, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: gmail_oauth_settings; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.gmail_oauth_settings (id, user_id, email, access_token, refresh_token, token_expiry, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: gmail_settings; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.gmail_settings (id, user_id, access_token, refresh_token, token_expiry, gmail_email, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: google_oauth_settings; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.google_oauth_settings (id, user_id, access_token, refresh_token, expires_at, email, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: link_clicks; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.link_clicks (id, newsletter_id, url, click_count, unique_visitors, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: newsletter_analytics; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.newsletter_analytics (id, newsletter_id, total_recipients, total_opens, unique_opens, total_clicks, unique_clicks, bounce_count, created_at, updated_at, event_type, recipient_email, user_agent, ip_address, metadata, browser, device, country, city, email_client, engagement_time_seconds, ab_test_variant, click_position) FROM stdin;
\.


--
-- Data for Name: newsletter_clicks; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.newsletter_clicks (id, newsletter_id, subscriber_email, clicked_url, clicked_at, user_agent, ip_address) FROM stdin;
\.


--
-- Data for Name: newsletter_metrics; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.newsletter_metrics (id, newsletter_id, total_opens, unique_opens, total_clicks, unique_clicks, last_updated) FROM stdin;
\.


--
-- Data for Name: newsletter_opens; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.newsletter_opens (id, newsletter_id, subscriber_email, opened_at, user_agent, ip_address) FROM stdin;
\.


--
-- Data for Name: newsletter_templates; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.newsletter_templates (id, name, description, content, created_at, updated_at, is_default, category, metadata) FROM stdin;
\.


--
-- Data for Name: newsletters; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.newsletters (id, user_id, title, content, template_id, status, created_at, updated_at, scheduled_at, schedule_status, scheduled_for) FROM stdin;
72	85	Latest News Update	{"html": "<p class=\\"mb-4 leading-relaxed\\"></p>\\n\\n\\n              \\n                \\n                  <img style=\\"width: 100%; max-width: 540px; height: auto; display: block; margin: 0 auto; border-radius: 8px;\\" alt=\\"Header image\\" src=\\"https://oaidalleapiprodscus.blob.core.windows.net/private/org-zSk8pfH79ABJTQVfPInP1W4W/user-H6O7RTPwcrxK4wIVGsELduzJ/img-CLRFtdNxjnTBOUd5lBq5Enej.png?st=2025-03-25T08%3A18%3A50Z&amp;se=2025-03-25T10%3A18%3A50Z&amp;sp=r&amp;sv=2024-08-04&amp;sr=b&amp;rscd=inline&amp;rsct=image/png&amp;skoid=d505667d-d6c1-4a0a-bac7-5c84a87759f8&amp;sktid=a48cca56-e6da-484e-a814-9c849652bcb3&amp;skt=2025-03-24T19%3A13%3A12Z&amp;ske=2025-03-25T19%3A13%3A12Z&amp;sks=b&amp;skv=2024-08-04&amp;sig=OOzYyxpWfcA4Tb1q97jvkUJhvweeZJzQXJ11p4gplBg%3D\\">\\n                \\n              \\n            \\n\\n<p></p>\\n\\n<h1 class=\\"text-4xl font-bold\\"></h1><h1 class=\\"text-4xl font-bold\\"></h1>\\n\\n<h1 class=\\"text-4xl font-bold\\"></h1><h1 class=\\"text-4xl font-bold mb-6\\">\\n              \\n                \\n                  <h1 style=\\"font-size: 32px; font-weight: 700; color: #111827; margin: 0; line-height: 1.2;\\">Hey Foodies, We've Cooked Up Something Special!</h1>\\n                \\n              \\n            </h1>\\n\\n<p class=\\"mb-4 leading-relaxed\\"></p><br><p></p>\\n              \\n                \\n                  \\n                    \\n                      \\n                        Hello, my #FoodFam!\\n                      \\n                    \\n                  \\n                \\n              \\n            <p></p><br><p></p>\\n\\n<p class=\\"mb-4 leading-relaxed\\"></p><br><p></p>\\n              \\n                \\n                  \\n                    \\n                      \\n                        I hope this newsletter finds you well and ready to explore some exciting culinary adventures together.\\n                      \\n                    \\n                  \\n                \\n              \\n            <p></p><br><p></p>\\n\\n<h2 class=\\"text-3xl font-bold\\"></h2><h2 class=\\"text-3xl font-bold\\"></h2>\\n\\n<h2 class=\\"text-3xl font-bold\\"></h2><h2 class=\\"text-3xl font-bold mb-4\\">\\n              \\n                \\n                  <h2 style=\\"font-size: 28px; font-weight: 600; color: #1f2937; margin: 0; line-height: 1.3;\\">🎉 New Video Alert!</h2>\\n                \\n              \\n            </h2>\\n\\n<p class=\\"mb-4 leading-relaxed\\"></p><br><p></p>\\n              \\n                \\n                  \\n                    \\n                      \\n                        Our latest vlog is now live on YouTube! We're taking you on a gastronomic journey, filled with mouth-watering dishes and enchanting flavors.\\n                      \\n                    \\n                  \\n                \\n              \\n            <p></p><br><p></p>\\n\\n<h3 class=\\"text-2xl font-bold\\"></h3><h3 class=\\"text-2xl font-bold\\"></h3>\\n\\n<h3 class=\\"text-2xl font-bold\\"></h3><h3 class=\\"text-2xl font-bold mb-3\\">\\n              \\n                \\n                  <h3 style=\\"font-size: 24px; font-weight: 600; color: #374151; margin: 0; line-height: 1.4;\\">What's on the Menu?</h3>\\n                \\n              \\n            </h3>\\n\\n<p class=\\"mb-4 leading-relaxed\\"></p><br><p></p>\\n            \\n              \\n                \\n                  \\n                    \\n                      <ul style=\\"list-style: none;\\n                        padding: 0;\\n                        margin: 0;\\n                        text-align: left;\\">\\n                        \\n                          <li style=\\"position: relative;\\n                            padding-left: 1.5em;\\n                            margin-bottom: 0.75em;\\n                            line-height: 1.6;\\n                            color: #4b5563;\\n                            font-size: 16px;\\">\\n                            <span style=\\"position: absolute;\\n                              left: 0;\\n                              top: 0;\\n                              font-size: 16px;\\">•</span>\\n                            A savory appetizer that will make your taste buds dance.\\n                          </li>\\n                        \\n                          <li style=\\"position: relative;\\n                            padding-left: 1.5em;\\n                            margin-bottom: 0.75em;\\n                            line-height: 1.6;\\n                            color: #4b5563;\\n                            font-size: 16px;\\">\\n                            <span style=\\"position: absolute;\\n                              left: 0;\\n                              top: 0;\\n                              font-size: 16px;\\">•</span>\\n                            A main course that's a feast for both the eyes and palate.\\n                          </li>\\n                        \\n                          <li style=\\"position: relative;\\n                            padding-left: 1.5em;\\n                            margin-bottom: 0.75em;\\n                            line-height: 1.6;\\n                            color: #4b5563;\\n                            font-size: 16px;\\">\\n                            <span style=\\"position: absolute;\\n                              left: 0;\\n                              top: 0;\\n                              font-size: 16px;\\">•</span>\\n                            And a dessert that's the sweetest ending to any meal.\\n                          </li>\\n                        \\n                      </ul>\\n                    \\n                  \\n                \\n              \\n            \\n          <p></p><br><p></p>\\n\\n<p class=\\"mb-4 leading-relaxed\\"></p><br><p></p>\\n              \\n                \\n                  \\n                    \\n                      \\n                        Be sure to watch all the way through to discover some secret tips and tricks!\\n                      \\n                    \\n                  \\n                \\n              \\n            <p></p><br><p></p>\\n\\n<h3 class=\\"text-2xl font-bold\\"></h3><h3 class=\\"text-2xl font-bold\\"></h3>\\n\\n<h3 class=\\"text-2xl font-bold\\"></h3><h3 class=\\"text-2xl font-bold mb-3\\">\\n              \\n                \\n                  <h3 style=\\"font-size: 24px; font-weight: 600; color: #374151; margin: 0; line-height: 1.4;\\">Stay Connected</h3>\\n                \\n              \\n            </h3>\\n\\n<p class=\\"mb-4 leading-relaxed\\"></p><br><p></p>\\n              \\n                \\n                  \\n                    \\n                      \\n                        Don't forget to like, share, and subscribe to our channel if you haven't already. Your support helps us continue to bring you delicious content every week.\\n                      \\n                    \\n                  \\n                \\n              \\n            <p></p><br><p></p>\\n\\n<p></p><br><p></p>\\n              \\n                \\n                  \\n                    \\n                      \\n                        \\"Food is our common ground, a universal experience.\\" - James Beard\\n                      \\n                    \\n                  \\n                \\n              \\n            <p></p><br><p></p>\\n\\n<p class=\\"mb-4 leading-relaxed\\"></p><br><p></p>\\n              \\n                \\n                  \\n                    \\n                      \\n                        Until next time, stay hungry and keep exploring.\\n                      \\n                    \\n                  \\n                \\n              \\n            <p></p><br><p></p>"}	\N	sent	2025-03-25 10:58:42.202935	2025-03-25 10:58:42.202935	\N	pending	\N
74	85	Latest News Update	{"html": "<p class=\\"mb-4 leading-relaxed\\"></p>\\n\\n\\n              \\n                \\n                  <img style=\\"width: 100%; max-width: 540px; height: auto; display: block; margin: 0 auto; border-radius: 8px;\\" alt=\\"Header image\\" src=\\"https://oaidalleapiprodscus.blob.core.windows.net/private/org-zSk8pfH79ABJTQVfPInP1W4W/user-H6O7RTPwcrxK4wIVGsELduzJ/img-CLRFtdNxjnTBOUd5lBq5Enej.png?st=2025-03-25T08%3A18%3A50Z&amp;se=2025-03-25T10%3A18%3A50Z&amp;sp=r&amp;sv=2024-08-04&amp;sr=b&amp;rscd=inline&amp;rsct=image/png&amp;skoid=d505667d-d6c1-4a0a-bac7-5c84a87759f8&amp;sktid=a48cca56-e6da-484e-a814-9c849652bcb3&amp;skt=2025-03-24T19%3A13%3A12Z&amp;ske=2025-03-25T19%3A13%3A12Z&amp;sks=b&amp;skv=2024-08-04&amp;sig=OOzYyxpWfcA4Tb1q97jvkUJhvweeZJzQXJ11p4gplBg%3D\\">\\n                \\n              \\n            \\n\\n<p></p>\\n\\n<h1 class=\\"text-4xl font-bold\\"></h1><h1 class=\\"text-4xl font-bold\\"></h1>\\n\\n<h1 class=\\"text-4xl font-bold\\"></h1><h1 class=\\"text-4xl font-bold mb-6\\">\\n              \\n                \\n                  <h1 style=\\"font-size: 32px; font-weight: 700; color: #111827; margin: 0; line-height: 1.2;\\">Hey Foodies, We've Cooked Up Something Special!</h1>\\n                \\n              \\n            </h1>\\n\\n<p class=\\"mb-4 leading-relaxed\\"></p><br><p></p>\\n              \\n                \\n                  \\n                    \\n                      \\n                        Hello, my #FoodFam!\\n                      \\n                    \\n                  \\n                \\n              \\n            <p></p><br><p></p>\\n\\n<p class=\\"mb-4 leading-relaxed\\"></p><br><p></p>\\n              \\n                \\n                  \\n                    \\n                      \\n                        I hope this newsletter finds you well and ready to explore some exciting culinary adventures together.\\n                      \\n                    \\n                  \\n                \\n              \\n            <p></p><br><p></p>\\n\\n<h2 class=\\"text-3xl font-bold\\"></h2><h2 class=\\"text-3xl font-bold\\"></h2>\\n\\n<h2 class=\\"text-3xl font-bold\\"></h2><h2 class=\\"text-3xl font-bold mb-4\\">\\n              \\n                \\n                  <h2 style=\\"font-size: 28px; font-weight: 600; color: #1f2937; margin: 0; line-height: 1.3;\\">🎉 New Video Alert!</h2>\\n                \\n              \\n            </h2>\\n\\n<p class=\\"mb-4 leading-relaxed\\"></p><br><p></p>\\n              \\n                \\n                  \\n                    \\n                      \\n                        Our latest vlog is now live on YouTube! We're taking you on a gastronomic journey, filled with mouth-watering dishes and enchanting flavors.\\n                      \\n                    \\n                  \\n                \\n              \\n            <p></p><br><p></p>\\n\\n<h3 class=\\"text-2xl font-bold\\"></h3><h3 class=\\"text-2xl font-bold\\"></h3>\\n\\n<h3 class=\\"text-2xl font-bold\\"></h3><h3 class=\\"text-2xl font-bold mb-3\\">\\n              \\n                \\n                  <h3 style=\\"font-size: 24px; font-weight: 600; color: #374151; margin: 0; line-height: 1.4;\\">What's on the Menu?</h3>\\n                \\n              \\n            </h3>\\n\\n<p class=\\"mb-4 leading-relaxed\\"></p><br><p></p>\\n            \\n              \\n                \\n                  \\n                    \\n                      <ul style=\\"list-style: none;\\n                        padding: 0;\\n                        margin: 0;\\n                        text-align: left;\\">\\n                        \\n                          <li style=\\"position: relative;\\n                            padding-left: 1.5em;\\n                            margin-bottom: 0.75em;\\n                            line-height: 1.6;\\n                            color: #4b5563;\\n                            font-size: 16px;\\">\\n                            <span style=\\"position: absolute;\\n                              left: 0;\\n                              top: 0;\\n                              font-size: 16px;\\">•</span>\\n                            A savory appetizer that will make your taste buds dance.\\n                          </li>\\n                        \\n                          <li style=\\"position: relative;\\n                            padding-left: 1.5em;\\n                            margin-bottom: 0.75em;\\n                            line-height: 1.6;\\n                            color: #4b5563;\\n                            font-size: 16px;\\">\\n                            <span style=\\"position: absolute;\\n                              left: 0;\\n                              top: 0;\\n                              font-size: 16px;\\">•</span>\\n                            A main course that's a feast for both the eyes and palate.\\n                          </li>\\n                        \\n                          <li style=\\"position: relative;\\n                            padding-left: 1.5em;\\n                            margin-bottom: 0.75em;\\n                            line-height: 1.6;\\n                            color: #4b5563;\\n                            font-size: 16px;\\">\\n                            <span style=\\"position: absolute;\\n                              left: 0;\\n                              top: 0;\\n                              font-size: 16px;\\">•</span>\\n                            And a dessert that's the sweetest ending to any meal.\\n                          </li>\\n                        \\n                      </ul>\\n                    \\n                  \\n                \\n              \\n            \\n          <p></p><br><p></p>\\n\\n<p class=\\"mb-4 leading-relaxed\\"></p><br><p></p>\\n              \\n                \\n                  \\n                    \\n                      \\n                        Be sure to watch all the way through to discover some secret tips and tricks!\\n                      \\n                    \\n                  \\n                \\n              \\n            <p></p><br><p></p>\\n\\n<h3 class=\\"text-2xl font-bold\\"></h3><h3 class=\\"text-2xl font-bold\\"></h3>\\n\\n<h3 class=\\"text-2xl font-bold\\"></h3><h3 class=\\"text-2xl font-bold mb-3\\">\\n              \\n                \\n                  <h3 style=\\"font-size: 24px; font-weight: 600; color: #374151; margin: 0; line-height: 1.4;\\">Stay Connected</h3>\\n                \\n              \\n            </h3>\\n\\n<p class=\\"mb-4 leading-relaxed\\"></p><br><p></p>\\n              \\n                \\n                  \\n                    \\n                      \\n                        Don't forget to like, share, and subscribe to our channel if you haven't already. Your support helps us continue to bring you delicious content every week.\\n                      \\n                    \\n                  \\n                \\n              \\n            <p></p><br><p></p>\\n\\n<p></p><br><p></p>\\n              \\n                \\n                  \\n                    \\n                      \\n                        \\"Food is our common ground, a universal experience.\\" - James Beard\\n                      \\n                    \\n                  \\n                \\n              \\n            <p></p><br><p></p>\\n\\n<p class=\\"mb-4 leading-relaxed\\"></p><br><p></p>\\n              \\n                \\n                  \\n                    \\n                      \\n                        Until next time, stay hungry and keep exploring.\\n                      \\n                    \\n                  \\n                \\n              \\n            <p></p><br><p></p>", "isTest": false}	\N	sent	2025-03-25 11:10:17.174627	2025-03-25 11:12:42.926	2025-03-25 11:12:00+00	pending	\N
75	85	Latest News Update	{"html": "<h2 class=\\"text-3xl font-bold\\"></h2><h2><span style=\\"color: rgb(0, 128, 0);\\">How I Ditched Google Photos and Built My Own Photo Server</span></h2>\\n\\n<p>I grew tired of paying for Google One storage just to use Google Photos. Plus, I wanted more privacy and security over my stored pictures. What did I do? I built my own server to replace Google Photos...</p><br><p></p><div style=\\"margin-top: 1rem; font-size: 0.9em; color: #666;\\" class=\\"story-meta\\">\\n          <p>Source: <a target=\\"_blank\\" href=\\"https://www.howtogeek.com/ditched-google-photos-built-my-own-photo-server/\\">The How-To Geek</a></p><br>          <p>Date: 3/25/2025</p>\\n          <p>Category: dmoz/Computers/Internet/E-mail</p><br>        </div><p></p>\\n\\n<h2 class=\\"text-3xl font-bold\\"></h2><h2>Dell Pro 14 Premium (PA14250)</h2>\\n\\n<p>You'll find dozens of varieties of laptops, but the most fiercely competitive class barely registers at Best Buy, Costco, or vendors' websites: 14-inch business systems bought in bulk for corporate fl...</p><br><p></p><div style=\\"margin-top: 1rem; font-size: 0.9em; color: #666;\\" class=\\"story-meta\\">\\n          <p>Source: <a target=\\"_blank\\" href=\\"https://me.pcmag.com/en/laptops/29019/dell-pro-14-premium-pa14250\\">PC Mag Middle East</a></p><br>          <p>Date: 3/25/2025</p>\\n          <p>Category: dmoz/Computers/Systems</p><br>        </div><p></p>", "isTest": false}	\N	sent	2025-03-25 11:15:38.311374	2025-03-25 11:17:41.69	2025-03-25 11:17:00+00	pending	\N
76	85	Latest News Update	{"html": "<h2 class=\\"text-3xl font-bold\\"></h2><h2>Contentious development to come to Cape Coral's Redfish Pointe. Here's what we know</h2>\\n\\n<p>Aerial footage of Cape Coral land where controversial development is being planned in Redfish Pointe.<br>A contentious proposal to develop Redfish Pointe, a 350-acre parcel located south of Rotary Park ...</p>\\n\\n<p></p><div style=\\"margin-top: 1rem; font-size: 0.9em; color: #666;\\" class=\\"story-meta\\"><br>          <p>Source: <a target=\\"_blank\\" href=\\"https://eu.news-press.com/story/news/local/cape-coral/2025/03/25/cape-coral-residents-fear-redfish-pointe-projects-environmental-traffic-impact/82277165007/\\">The News-Press</a></p>\\n          <p>Date: 3/25/2025</p><br>          <p>Category: dmoz/Science/Environment</p>\\n        </div><p></p><br><p></p><p></p>\\n\\n<h2 class=\\"text-3xl font-bold\\"></h2><h2>US, Iceland, Greece, France, Spain, Thailand, and New Zealand Crack Down on Tourists with Hefty Fines for Taking Natural Souvenirs: What Travelers Need to Know - Travel And Tour World</h2>\\n\\n<p>Taking sand, shells, rocks, or other natural materials from beaches and protected landscapes might seem like a harmless way to remember a trip -- but in countries like the United States, Iceland, Gree...</p><br><p></p><div style=\\"margin-top: 1rem; font-size: 0.9em; color: #666;\\" class=\\"story-meta\\">\\n          <p>Source: <a target=\\"_blank\\" href=\\"https://www.travelandtourworld.com/news/article/us-iceland-greece-france-spain-thailand-and-new-zealand-crack-down-on-tourists-with-hefty-fines-for-taking-natural-souvenirs-what-travelers-need-to-know/\\">Travel And Tour World</a></p><br>          <p>Date: 3/25/2025</p>\\n          <p>Category: dmoz/Recreation/Nudism</p><br>        </div><p></p>\\n\\n<p></p><p></p>", "isTest": false}	\N	sent	2025-03-25 11:31:49.061046	2025-03-25 11:34:02.909	2025-03-25 11:34:00+00	pending	\N
78	85	Latest News Update	{"html": "<h2 class=\\"text-3xl font-bold\\"></h2><h2>Commandos: Origins - Everything You Need to Know</h2>\\n\\n<p>Sorely missed real-time tactics progenitor returns in 2025 with its first entry in almost two decades. Commandos: Origins explores the origins of the elite covert-ops unit as they undertake the first ...</p><br><p></p><div style=\\"margin-top: 1rem; font-size: 0.9em; color: #666;\\" class=\\"story-meta\\">\\n          <p>Source: <a target=\\"_blank\\" href=\\"https://gamingbolt.com/commandos-origins-everything-you-need-to-know\\">GamingBolt</a></p><br>          <p>Date: 3/25/2025</p>\\n          <p>Category: dmoz/Games/Board Games/War and Politics</p><br>        </div><p></p>\\n\\n<h2 class=\\"text-3xl font-bold\\"></h2><h2>Descope Announces New Capabilities to Help Ecommerce Companies Deliver Omnichannel User Experiences</h2>\\n\\n<p>Anonymous user tracking, native mobile flows, and ecommerce platform integrations help ecommerce apps achieve 360 customer view without sacrificing security<br>LOS ALTOS, Calif., March 25, 2025 (GLOBE N...</p>\\n\\n<p></p><div style=\\"margin-top: 1rem; font-size: 0.9em; color: #666;\\" class=\\"story-meta\\"><br>          <p>Source: <a target=\\"_blank\\" href=\\"https://www.manilatimes.net/2025/03/25/tmt-newswire/globenewswire/descope-announces-new-capabilities-to-help-ecommerce-companies-deliver-omnichannel-user-experiences/2079738\\">The Manila times</a></p>\\n          <p>Date: 3/25/2025</p><br>          <p>Category: dmoz/Computers/Internet</p>\\n        </div><p></p>\\n\\n\\n          <div style=\\"text-align: center;\\" data-block-type=\\"image\\" class=\\"image-block\\">\\n            <div class=\\"image-wrapper\\">\\n              <img style=\\"max-width: 100%; height: auto; display: block; margin: 0 auto;\\" alt=\\"Uploaded image\\" src=\\"https://3d030f67-658e-46ea-b894-789f1060c0e1-00-rfnzxambwv0e.sisko.replit.dev/uploads/image-1742909133138-12848980.png\\">\\n            </div>\\n          </div>\\n        "}	\N	sent	2025-03-25 13:25:52.369701	2025-03-25 13:25:52.369701	\N	pending	\N
79	85	Latest News Update	{"html": "<h2 class=\\"text-3xl font-bold\\"></h2><h2>Commandos: Origins - Everything You Need to Know</h2>\\n\\n<p>Sorely missed real-time tactics progenitor returns in 2025 with its first entry in almost two decades. Commandos: Origins explores the origins of the elite covert-ops unit as they undertake the first ...</p><br><p></p><div style=\\"margin-top: 1rem; font-size: 0.9em; color: #666;\\" class=\\"story-meta\\">\\n          <p>Source: <a target=\\"_blank\\" href=\\"https://gamingbolt.com/commandos-origins-everything-you-need-to-know\\">GamingBolt</a></p><br>          <p>Date: 3/25/2025</p>\\n          <p>Category: dmoz/Games/Board Games/War and Politics</p><br>        </div><p></p>\\n\\n<h2 class=\\"text-3xl font-bold\\"></h2><h2>Descope Announces New Capabilities to Help Ecommerce Companies Deliver Omnichannel User Experiences</h2>\\n\\n<p>Anonymous user tracking, native mobile flows, and ecommerce platform integrations help ecommerce apps achieve 360 customer view without sacrificing security<br>LOS ALTOS, Calif., March 25, 2025 (GLOBE N...</p>\\n\\n<p></p><div style=\\"margin-top: 1rem; font-size: 0.9em; color: #666;\\" class=\\"story-meta\\"><br>          <p>Source: <a target=\\"_blank\\" href=\\"https://www.manilatimes.net/2025/03/25/tmt-newswire/globenewswire/descope-announces-new-capabilities-to-help-ecommerce-companies-deliver-omnichannel-user-experiences/2079738\\">The Manila times</a></p>\\n          <p>Date: 3/25/2025</p><br>          <p>Category: dmoz/Computers/Internet</p>\\n        </div><p></p>\\n\\n<div style=\\"text-align: center;\\" data-block-type=\\"image\\" class=\\"image-block\\">\\n            <div class=\\"image-wrapper\\">\\n              <img style=\\"max-width: 100%; height: auto; display: block; margin: 0 auto;\\" alt=\\"Uploaded image\\" src=\\"https://3d030f67-658e-46ea-b894-789f1060c0e1-00-rfnzxambwv0e.sisko.replit.dev/uploads/image-1742909750213-674495899.jpg\\">\\n            </div>\\n          </div>"}	\N	sent	2025-03-25 13:36:43.310732	2025-03-25 13:36:43.310732	\N	pending	\N
77	85	Latest News Update	{"html": "<h2 class=\\"text-3xl font-bold\\"></h2><h2>US, Iceland, Greece, France, Spain, Thailand, and New Zealand Crack Down on Tourists with Hefty Fines for Taking Natural Souvenirs: What Travelers Need to Know - Travel And Tour World</h2>\\n\\n<p>Taking sand, shells, rocks, or other natural materials from beaches and protected landscapes might seem like a harmless way to remember a trip -- but in countries like the United States, Iceland, Gree...</p><br><p></p><div style=\\"margin-top: 1rem; font-size: 0.9em; color: #666;\\" class=\\"story-meta\\">\\n          <p>Source: <a target=\\"_blank\\" href=\\"https://www.travelandtourworld.com/news/article/us-iceland-greece-france-spain-thailand-and-new-zealand-crack-down-on-tourists-with-hefty-fines-for-taking-natural-souvenirs-what-travelers-need-to-know/\\">Travel And Tour World</a></p><br>          <p>Date: 3/25/2025</p>\\n          <p>Category: dmoz/Recreation/Nudism</p><br>        </div><p></p>\\n\\n<p></p><p></p>\\n\\n<h2 class=\\"text-3xl font-bold\\"></h2><h2>Climate change spikes wildfire risk in Sri Lanka</h2>\\n\\n<p>COLOMBO - Ella, one of Sri Lanka's most popular tourist destinations, draws scores of foreign visitors who come to admire its natural beauty and marvel at engineering wonders like the famous nine-arch...</p><br><p></p><div style=\\"margin-top: 1rem; font-size: 0.9em; color: #666;\\" class=\\"story-meta\\">\\n          <p>Source: <a target=\\"_blank\\" href=\\"https://news.mongabay.com/2025/03/climate-change-spikes-wildfire-risk-in-sri-lanka/\\">Mongabay</a></p><br>          <p>Date: 3/25/2025</p>\\n          <p>Category: dmoz/Science/Environment/Biodiversity</p><br>        </div><p></p>\\n\\n<p></p><p></p>", "isTest": false}	\N	sent	2025-03-25 11:36:59.538312	2025-03-25 17:17:40.683	2025-03-25 17:17:00+00	pending	\N
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.notifications (id, user_id, type, message, detail, read, created_at) FROM stdin;
\.


--
-- Data for Name: scheduled_emails; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.scheduled_emails (id, user_id, subject, html_content, recipients, scheduled_time, status, created_at, metadata, updated_at) FROM stdin;
\.


--
-- Data for Name: scheduled_newsletters; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.scheduled_newsletters (id, user_id, subject, content, scheduled_time, status, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: sent_newsletters; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.sent_newsletters (id, newsletter_id, sent_at, recipient_count) FROM stdin;
\.


--
-- Data for Name: subscriber_group_members; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.subscriber_group_members (id, subscriber_id, group_id, added_at) FROM stdin;
7	55	1	2025-03-26 06:49:16.8776+00
\.


--
-- Data for Name: subscriber_groups; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.subscriber_groups (id, user_id, name, description, created_at, updated_at) FROM stdin;
1	85	Linkedin	Linkedin subscribers	2025-02-20 17:50:57.377406+00	2025-02-20 17:50:57.377406+00
5	85	Youtube	\N	2025-03-26 07:07:58.178032+00	2025-03-26 07:07:58.178032+00
6	131	Linkedin	\N	2025-03-26 10:45:03.237819+00	2025-03-26 10:45:03.237819+00
\.


--
-- Data for Name: subscriber_tags; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.subscriber_tags (subscriber_id, tag_id, created_at) FROM stdin;
\.


--
-- Data for Name: subscribers; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.subscribers (id, user_id, email, name, active, created_at, updated_at, tags) FROM stdin;
4	3	ravi@gmail.com	Ravi	t	2024-11-25 08:06:50.418539+00	2024-11-25 08:06:50.418539+00	{}
55	85	naman@immerzo.io	Naman	t	2025-03-25 07:55:27.634238+00	2025-03-25 07:55:27.634238+00	{}
12	1	Aman@gmail.com	Aman	t	2024-11-26 10:16:02.013284+00	2024-11-26 10:16:02.013284+00	{}
13	1	Aman123@gmail.com	Aman1	t	2024-11-26 10:16:37.219286+00	2024-11-26 10:16:37.219286+00	{}
17	3	ravi111@gmail.com	bob	t	2024-11-27 07:53:18.492983+00	2024-11-27 07:53:18.492983+00	{}
18	3	Aman@gmail.com	Aman	t	2024-11-27 08:05:09.591482+00	2024-11-27 08:05:09.591482+00	{}
19	3	namanjoc9761@gmail.com	Naman	t	2024-11-27 09:02:20.971238+00	2024-11-27 09:02:20.971238+00	{}
33	4	namanjoc9761@gmail.com	Naman	t	2024-11-29 05:38:16.481762+00	2024-11-29 05:38:16.481762+00	{}
52	131	naman@immerzo.io	Naman	t	2025-03-10 11:49:03.532055+00	2025-03-10 11:49:03.532055+00	{}
\.


--
-- Data for Name: tags; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.tags (id, user_id, name, description, created_at) FROM stdin;
\.


--
-- Data for Name: templates; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.templates (name, description, html, created_at, blocks, structure, user_id, preview, updated_at, id) FROM stdin;
test_check1	test_check1	<h2 class="text-3xl font-bold"></h2><h2>Commandos: Origins - Everything You Need to Know</h2>\n\n<p>Sorely missed real-time tactics progenitor returns in 2025 with its first entry in almost two decades. Commandos: Origins explores the origins of the elite covert-ops unit as they undertake the first ...</p>\n\n<p></p><div class="story-meta" style="margin-top: 1rem; font-size: 0.9em; color: #666;">\n          <p>Source: <a href="https://gamingbolt.com/commandos-origins-everything-you-need-to-know" target="_blank">GamingBolt</a></p>\n          <p>Date: 3/25/2025</p>\n          <p>Category: dmoz/Games/Board Games/War and Politics</p>\n        </div><p></p>\n\n<h2 class="text-3xl font-bold"></h2><h2>Descope Announces New Capabilities to Help Ecommerce Companies Deliver Omnichannel User Experiences</h2>\n\n<p>Anonymous user tracking, native mobile flows, and ecommerce platform integrations help ecommerce apps achieve 360 customer view without sacrificing security\n\nLOS ALTOS, Calif., March 25, 2025 (GLOBE N...</p>\n\n<p></p><div class="story-meta" style="margin-top: 1rem; font-size: 0.9em; color: #666;">\n          <p>Source: <a href="https://www.manilatimes.net/2025/03/25/tmt-newswire/globenewswire/descope-announces-new-capabilities-to-help-ecommerce-companies-deliver-omnichannel-user-experiences/2079738" target="_blank">The Manila times</a></p>\n          <p>Date: 3/25/2025</p>\n          <p>Category: dmoz/Computers/Internet</p>\n        </div><p></p>\n\n<div class="image-block" contenteditable="false" draggable="true" data-block-type="image" style="text-align: center;">\n            <div class="image-wrapper">\n              <img src="https://3d030f67-658e-46ea-b894-789f1060c0e1-00-rfnzxambwv0e.sisko.replit.dev/uploads/image-1742909750213-674495899.jpg" alt="Uploaded image" style="max-width: 100%; height: auto; display: block; margin: 0 auto;">\n            </div>\n          </div>	2025-03-25 13:38:03.318293	[{"id": "block-1742909881877-0-11eiwinkd", "type": "h2", "content": "<h2 class=\\"text-3xl font-bold\\"></h2>"}, {"id": "block-1742909881877-1-ep6oh59te", "type": "h2", "content": "<h2>Commandos: Origins - Everything You Need to Know</h2>"}, {"id": "block-1742909881877-2-q0rl9kpdh", "type": "text", "content": "<p>Sorely missed real-time tactics progenitor returns in 2025 with its first entry in almost two decades. Commandos: Origins explores the origins of the elite covert-ops unit as they undertake the first ...</p>"}, {"id": "block-1742909881877-3-u4gesalhd", "type": "text", "content": "<p></p>"}, {"id": "block-1742909881877-4-dlqg2k5vm", "type": "text", "content": "<div class=\\"story-meta\\" style=\\"margin-top: 1rem; font-size: 0.9em; color: #666;\\">\\n          <p>Source: <a href=\\"https://gamingbolt.com/commandos-origins-everything-you-need-to-know\\" target=\\"_blank\\">GamingBolt</a></p>\\n          <p>Date: 3/25/2025</p>\\n          <p>Category: dmoz/Games/Board Games/War and Politics</p>\\n        </div>"}, {"id": "block-1742909881877-5-goo5d8jzw", "type": "text", "content": "<p></p>"}, {"id": "block-1742909881877-6-d6ubcktn5", "type": "h2", "content": "<h2 class=\\"text-3xl font-bold\\"></h2>"}, {"id": "block-1742909881877-7-kz5jz8z33", "type": "h2", "content": "<h2>Descope Announces New Capabilities to Help Ecommerce Companies Deliver Omnichannel User Experiences</h2>"}, {"id": "block-1742909881877-8-7pxugz2wk", "type": "text", "content": "<p>Anonymous user tracking, native mobile flows, and ecommerce platform integrations help ecommerce apps achieve 360 customer view without sacrificing security\\n\\nLOS ALTOS, Calif., March 25, 2025 (GLOBE N...</p>"}, {"id": "block-1742909881877-9-622iv6lro", "type": "text", "content": "<p></p>"}, {"id": "block-1742909881877-10-5oazoibxq", "type": "text", "content": "<div class=\\"story-meta\\" style=\\"margin-top: 1rem; font-size: 0.9em; color: #666;\\">\\n          <p>Source: <a href=\\"https://www.manilatimes.net/2025/03/25/tmt-newswire/globenewswire/descope-announces-new-capabilities-to-help-ecommerce-companies-deliver-omnichannel-user-experiences/2079738\\" target=\\"_blank\\">The Manila times</a></p>\\n          <p>Date: 3/25/2025</p>\\n          <p>Category: dmoz/Computers/Internet</p>\\n        </div>"}, {"id": "block-1742909881877-11-c45ttest6", "type": "text", "content": "<p></p>"}, {"id": "block-1742909881877-12-fmgpdsob9", "type": "image", "content": "<div class=\\"image-block\\" contenteditable=\\"false\\" draggable=\\"true\\" data-block-type=\\"image\\" style=\\"text-align: center;\\">\\n            <div class=\\"image-wrapper\\">\\n              <img src=\\"https://3d030f67-658e-46ea-b894-789f1060c0e1-00-rfnzxambwv0e.sisko.replit.dev/uploads/image-1742909750213-674495899.jpg\\" alt=\\"Uploaded image\\" style=\\"max-width: 100%; height: auto; display: block; margin: 0 auto;\\">\\n            </div>\\n          </div>"}]	{"blocks": [{"id": "block-1742909881877-0-11eiwinkd", "type": "h2", "content": "<h2 class=\\"text-3xl font-bold\\"></h2>"}, {"id": "block-1742909881877-1-ep6oh59te", "type": "h2", "content": "<h2>Commandos: Origins - Everything You Need to Know</h2>"}, {"id": "block-1742909881877-2-q0rl9kpdh", "type": "text", "content": "<p>Sorely missed real-time tactics progenitor returns in 2025 with its first entry in almost two decades. Commandos: Origins explores the origins of the elite covert-ops unit as they undertake the first ...</p>"}, {"id": "block-1742909881877-3-u4gesalhd", "type": "text", "content": "<p></p>"}, {"id": "block-1742909881877-4-dlqg2k5vm", "type": "text", "content": "<div class=\\"story-meta\\" style=\\"margin-top: 1rem; font-size: 0.9em; color: #666;\\">\\n          <p>Source: <a href=\\"https://gamingbolt.com/commandos-origins-everything-you-need-to-know\\" target=\\"_blank\\">GamingBolt</a></p>\\n          <p>Date: 3/25/2025</p>\\n          <p>Category: dmoz/Games/Board Games/War and Politics</p>\\n        </div>"}, {"id": "block-1742909881877-5-goo5d8jzw", "type": "text", "content": "<p></p>"}, {"id": "block-1742909881877-6-d6ubcktn5", "type": "h2", "content": "<h2 class=\\"text-3xl font-bold\\"></h2>"}, {"id": "block-1742909881877-7-kz5jz8z33", "type": "h2", "content": "<h2>Descope Announces New Capabilities to Help Ecommerce Companies Deliver Omnichannel User Experiences</h2>"}, {"id": "block-1742909881877-8-7pxugz2wk", "type": "text", "content": "<p>Anonymous user tracking, native mobile flows, and ecommerce platform integrations help ecommerce apps achieve 360 customer view without sacrificing security\\n\\nLOS ALTOS, Calif., March 25, 2025 (GLOBE N...</p>"}, {"id": "block-1742909881877-9-622iv6lro", "type": "text", "content": "<p></p>"}, {"id": "block-1742909881877-10-5oazoibxq", "type": "text", "content": "<div class=\\"story-meta\\" style=\\"margin-top: 1rem; font-size: 0.9em; color: #666;\\">\\n          <p>Source: <a href=\\"https://www.manilatimes.net/2025/03/25/tmt-newswire/globenewswire/descope-announces-new-capabilities-to-help-ecommerce-companies-deliver-omnichannel-user-experiences/2079738\\" target=\\"_blank\\">The Manila times</a></p>\\n          <p>Date: 3/25/2025</p>\\n          <p>Category: dmoz/Computers/Internet</p>\\n        </div>"}, {"id": "block-1742909881877-11-c45ttest6", "type": "text", "content": "<p></p>"}, {"id": "block-1742909881877-12-fmgpdsob9", "type": "image", "content": "<div class=\\"image-block\\" contenteditable=\\"false\\" draggable=\\"true\\" data-block-type=\\"image\\" style=\\"text-align: center;\\">\\n            <div class=\\"image-wrapper\\">\\n              <img src=\\"https://3d030f67-658e-46ea-b894-789f1060c0e1-00-rfnzxambwv0e.sisko.replit.dev/uploads/image-1742909750213-674495899.jpg\\" alt=\\"Uploaded image\\" style=\\"max-width: 100%; height: auto; display: block; margin: 0 auto;\\">\\n            </div>\\n          </div>"}], "version": "1.0"}	85	/templates/blank-template.png	2025-03-25 13:38:03.318293+00	9883211
\.


--
-- Data for Name: user_credits; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.user_credits (id, user_id, total_credits_allocated, credits_remaining, last_updated, created_at) FROM stdin;
3	85	1700	1590	2025-03-24 14:35:29.084+00	2025-02-04 18:20:29.235135+00
28	137	50	50	2025-03-26 07:48:42.099197+00	2025-03-26 07:48:42.099197+00
30	139	50	50	2025-03-26 19:56:45.630475+00	2025-03-26 19:56:45.630475+00
31	140	50	49	2025-03-27 12:38:00.263+00	2025-03-27 12:33:20.869174+00
32	141	50	50	2025-03-27 13:00:23.901502+00	2025-03-27 13:00:23.901502+00
25	130	50	50	2025-03-02 20:27:09.869265+00	2025-03-02 20:27:09.869265+00
26	131	50	50	2025-03-03 07:24:19.07908+00	2025-03-03 07:24:19.07908+00
\.


--
-- Data for Name: user_feedback; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.user_feedback (id, user_id, feedback_type, message, rating, created_at, status, category) FROM stdin;
\.


--
-- Data for Name: user_redeemed_codes; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.user_redeemed_codes (id, user_id, code_id, redeemed_at) FROM stdin;
5	85	6008	2025-02-04 18:20:30.762+00
6	85	6009	2025-02-04 18:20:30.762+00
7	85	6010	2025-02-04 18:20:30.762+00
8	86	6012	2025-02-05 11:31:43.195+00
9	86	6013	2025-02-05 11:31:43.195+00
10	86	6014	2025-02-05 11:31:43.195+00
\.


--
-- Data for Name: user_subscriptions; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.user_subscriptions (id, user_id, tier, total_codes_redeemed, activated_at, updated_at, status, provider, metadata, initial_ai_credits, subscriber_limit, stripe_customer_id, stripe_subscription_id, stripe_payment_method_id) FROM stdin;
7	85	professional	3	2025-02-04 18:20:30.283+00	2025-02-04 18:20:30.283+00	active	appsumo	\N	500	20000	\N	\N	\N
8	86	professional	3	2025-02-05 11:31:42.749+00	2025-02-05 11:31:42.749+00	active	appsumo	\N	500	20000	\N	\N	\N
15	99	starter	0	2025-02-28 18:55:50.547+00	2025-02-28 18:55:50.547+00	active	stripe	{"stripeCustomerId": "cus_Rutni9jZQe0O3z", "payment_processed": true, "registration_date": "2025-02-28T18:55:50.547Z", "registration_source": "direct"}	1000	100	cus_Rutni9jZQe0O3z	\N	\N
23	130	starter	0	2025-03-02 20:27:09.788+00	2025-03-02 20:27:09.804275+00	active	stripe	{"trialEndsAt": "2025-03-16T20:27:09.788Z", "isTrialActive": true, "stripeCustomerId": "cus_Rs3CBL3Q56RtOn"}	50	5000	cus_Rs3CBL3Q56RtOn	\N	\N
24	131	starter	0	2025-03-03 07:24:18.998+00	2025-03-03 07:24:19.015744+00	active	stripe	{"trialEndsAt": "2025-03-17T07:24:18.998Z", "isTrialActive": true, "trialPeriodDays": 14, "stripeCustomerId": "cus_RsDn8jFseezxlr"}	50	5000	cus_RsDn8jFseezxlr	\N	\N
26	137	starter	0	2025-03-26 07:48:42.013+00	2025-03-26 07:48:42.030278+00	active	stripe	{"trialEndsAt": "2025-04-09T07:48:42.013Z", "isTrialActive": true, "trialPeriodDays": 14}	50	5000	cus_S0qNQoR3sFOtrt	sub_1R6ohFP33CWCiQss3vvkpbkq	\N
28	139	starter	0	2025-03-26 19:56:45.546+00	2025-03-26 19:56:45.56245+00	active	stripe	{"trialEndsAt": "2025-04-09T19:56:45.545Z", "isTrialActive": true, "trialPeriodDays": 14}	50	5000	cus_S128vxr4LqsLj2	sub_1R703uP33CWCiQsszNpx4TMo	\N
29	140	starter	0	2025-03-27 12:33:20.728+00	2025-03-27 12:33:20.742876+00	active	stripe	{"trialEndsAt": "2025-04-10T12:33:20.728Z", "isTrialActive": true, "trialPeriodDays": 14}	50	5000	cus_S1ICwwOETuUYWu	sub_1R7FcGP33CWCiQss4Mt1RfGm	\N
30	141	starter	0	2025-03-27 13:00:23.823+00	2025-03-27 13:00:23.838474+00	active	stripe	{"trialEndsAt": "2025-04-10T13:00:23.823Z", "isTrialActive": true, "trialPeriodDays": 14}	50	5000	cus_S1IdWTV7IUo0iy	sub_1R7G2UP33CWCiQssVrQy93nD	\N
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.users (id, username, password, clerk_user_id, oauth_provider, created_at, updated_at, full_name, email, image_url, avatarurl, fullname, updatedat, avatar_url, reset_password_token, reset_password_expires) FROM stdin;
1	naman	edba9a6fae0e2fea4cf4b25bf5d51aec255c7cf656e8eac8ca9cf706f3650d1281c3a0836e387d1db6fa8b734b6f5091b650549b7a6f7e4d2b78050d5cf727ac.29438acc83b731621324ee55c18bafc3	\N	\N	2025-01-03 14:20:28.199501+00	2025-01-03 14:20:28.199501+00	naman	naman@temp.com	\N	\N	naman	2025-01-16 07:16:55.961172	\N	\N	\N
10	Michael86	add8b235e4baae56a6c175a04bd1d9021add3eff78fdf7f8e7d1a36ac12ae82aa20577cd42cae800c20c039269edcac4e51bd67be8efd6db68dd4726cf3e75c1.d9fcffbc11ea7f719c7e099b537a7010	\N	\N	2025-01-03 14:20:28.199501+00	2025-01-03 14:20:28.199501+00	Michael86	Michael86@temp.com	\N	\N	Michael86	2025-01-16 07:16:55.961172	\N	\N	\N
12	testuser2	7a7831c9ab7c582106553e4ffc10bacca726555702ad923747e976ba73952a619d74ec4a130ce89d217bf9897ff0eae60ba68abefb303fcb484d30390746ea8e.d7d7c129d1596d622569291cf9edcbdb	\N	\N	2025-01-03 14:20:28.199501+00	2025-01-03 14:20:28.199501+00	testuser2	testuser2@temp.com	\N	\N	testuser2	2025-01-16 07:16:55.961172	\N	\N	\N
26	nikhiljp	c2e7e1e87d750626ef302d73e497e7d892526ffb4c7933de57f5791b787d7b5d2dabeaccc58f04441cea5b7857f211cd18d2c985574809c157876e0f9d7c11f1.92e73d3fa1cb629f96f45497f3789743	\N	\N	2025-01-03 14:20:28.199501+00	2025-01-03 14:20:28.199501+00	nikhiljp	nikhiljp@temp.com	\N	\N	nikhiljp	2025-01-16 07:16:55.961172	\N	\N	\N
3	naman1	351197134ec178bf7b5090a2db46c6aa1462064b20d51567682c5357c8433b694ca2ea0c69bad6f5d734b51169839ae9d6254c6f84906f0481072152b8ab9356.247cbe592fdcab8c65c40adb96ebf5f8	\N	\N	2025-01-03 14:20:28.199501+00	2025-01-16 09:31:01.275+00	Naman Joshi	naman@immerzo.io	/uploads/avatars/avatar-1737019859483-899948723.jpg	\N	Naman Joshi	2025-01-16 07:16:55.961172	\N	\N	\N
99	testuser_1740768948912	de1b5dfc0c015c4d45703da7ebef91d3138cfb7900c6729e3e29db4dffaf832f54143dbecd0c4628bf0f77da3b1b800c43b8712e40cc3f9c7f5ef169e04b150f.00a70aea6686a47213ba52523add6ef7	\N	\N	2025-02-28 18:55:48.953+00	2025-02-28 18:55:48.953+00	Test User	testuser_1740768948912@example.com	\N	\N	Test User	2025-02-28 18:55:50.417615	\N	\N	\N
43	Michael4	ddc77d316f1f951fab42462ff322b4f286f9b71992686134721a2f99254ee021bdeacc2d418ab2f684872d33691cefbbee1e9cdbd0772443efab5c420422b1cd.daa8785d48918e1c6771327062ad1d2b	\N	\N	2025-01-17 09:10:28.174241+00	2025-01-17 09:10:28.174241+00	Michael4	Michael4@temp.com	\N	\N	Michael4	2025-01-17 09:10:28.174241	\N	\N	\N
9	Mcknight3	3f0f958848e9cb1608325c054bf4d4965be66f899b44556aed08a3c9a194fd5ea37be4219ee503eaf9b755aaee2ce3181e878dfa862646f62b093da04cb45d25.96132a448fa4bdb19f72f9448c5868b9	\N	\N	2025-01-03 14:20:28.199501+00	2025-01-17 10:39:16.263+00	Michael 	me@michaelcoppola.co.uk	/uploads/avatars/avatar-1737110343466-903608192.jpeg	\N	Michael 	2025-01-16 07:16:55.961172	\N	\N	\N
4	naman2	82b2d5b15281df9a3cb18e8308df639dcb36196cbdd28e87ce9dbf0f947017b158b84bbdd85156b8ee4148a87c72d19f2fab09872f2c56e5fa75906e002553a5.c760802a0b84305da17cfddf2461ed16	\N	\N	2025-01-03 14:20:28.199501+00	2025-01-16 09:29:34.26+00	Naman Joshi	naman@immerzo.com	/uploads/avatars/avatar-1737019771344-303383004.jpg	\N	Naman Joshi	2025-01-16 07:16:55.961172	\N	af5ee6564f5096407913e33aad51122d323d49520420c252b82ada1b8e0819a5	2025-01-23 10:38:14.524+00
45	Ravi1	38d9d1b86b137bccf0afd45f7f4d41f319b4b0d8315989ab5e7cfaa6b6eafebe1958d0fc9c00c7324657e48c3da362de98988dc16677c201601a1ca0a3e15598.78cb1bf53d2883b0d10f48d294dfe465	\N	\N	2025-01-23 09:16:36.859493+00	2025-01-23 09:16:36.859493+00	Ravi ravi	ravi@gmail.com	\N	\N	Ravi ravi	2025-01-23 09:16:36.859493	\N	2ca4620edaeee407520d3931049362845bebd911ac190506f8786b8ab48f9924	2025-01-24 13:44:40.528+00
86	Test01	cc956f8f3fa57f8e7609541a8a6904104705e4bc4370b6fad5f715399be1ee42f044214f0a8b9d60c96f874c405d0f2d4637f78898a70451b42f865bf47e1ca0.6b6bcf6df1f4f74de0e08dbf396ede7f	\N	\N	2025-02-05 11:31:41.697237+00	2025-02-05 11:31:41.697237+00	Test01 user	Test01@gmail.com	\N	\N	Test01 user	2025-02-05 11:31:41.697237	\N	\N	\N
85	Test1	43870e9ebbb0406f630cd8a09b5ed85103e546b13dcd1a45de3393d82ad558a3904cd77f0d0f746d3b9732ea7ccbe52e79ebca0a53d1b84d35de0d41a3f5090a.2cd5fa65e602ea082f1bcca29a45eb9b	\N	\N	2025-02-04 18:20:29.235135+00	2025-02-07 11:06:02.911+00	Test1 user	Test1@gmail.com	\N	\N	Test1 user	2025-02-04 18:20:29.235135	\N	\N	\N
130	Naman23	a0957abc3965bde90c8034c12951706b6746811cef42e7d2a03cb7081c0ff1e227c0cbd6d4f799630a0da47a53a7c8d1a6056c0d563a99ee1f2bc3d55d1d7f98.6093f2643d734f471fe2cb5356b69f82	\N	\N	2025-03-02 20:27:09.743966+00	2025-03-02 20:27:09.743966+00	Naman Joshi	Naman23@gmail.io	\N	\N	\N	2025-03-02 20:27:09.743966	\N	\N	\N
131	Test3	868c8f30ab73e0eb619c2a6f8da513a2ab365f72ef87bd9b73fbfb13e77844115d4d851e9b7c21745cd13d7fb7b7c34282a74c0d1a1c436f65972c34d6a892a4.b88ec7465c7aac00d5668ed37a37187f	\N	\N	2025-03-03 07:24:18.953872+00	2025-03-03 07:24:18.953872+00	Test3 users	Test3@gmail.com	\N	\N	\N	2025-03-03 07:24:18.953872	\N	\N	\N
136	testuser	3e57709a61b580c2a1ba2b7379de29fc:51c6c46266d3b0539e5ce6a25c8ae1d749cbac62b90824597d50f530d11af5ef8000986578bd5cd3fd83a02771c948e9083c78873aa93ae00e48c188a3477050	\N	\N	2025-03-19 10:08:48.072144+00	2025-03-19 10:08:48.072144+00	Test User	test@example.com	\N	\N	\N	2025-03-19 10:08:48.072144	\N	\N	\N
137	Test23	2a384b3bac1cd898e09610628dfdccd818fedd2d274e8f866e7e500e4aba39b207aa25708c7a4597816d9341e29efe377c5044f341af41b3db24749d74f525ae.8c635d25245dff8e64946d587e28aff9	\N	\N	2025-03-26 07:48:41.956866+00	2025-03-26 07:48:41.956866+00	Test23 users	Test23@gmail.com	\N	\N	\N	2025-03-26 07:48:41.956866	\N	\N	\N
139	Mcnight1986	686f075fd1b40489f1a9afccb2b6daea55404755cb73e4efe0a7951c9c494a77b2efc18d3955c0317da5ac6357965b1a5e7c82ddffc7f39a84966c537cbd7a9a.b09a9f1babf5f8026edefa3e6f5e94ba	\N	\N	2025-03-26 19:56:45.499422+00	2025-03-26 19:56:45.499422+00	Michael  Coppola	michael@futurzy.com	\N	\N	\N	2025-03-26 19:56:45.499422	\N	\N	\N
140	BuzzGuy	40a8a97987f3ddaa6fd0b67c7340061f64203f061e9e3e94d6601d966c25553b4d9234ab8e1c571d6ce2fb223744153b453cf093a5960910015f76ccfac36626.16fcb163b8994b844392e8fb4cae87b1	\N	\N	2025-03-27 12:33:20.68122+00	2025-03-27 12:33:20.68122+00	Bobby Hutchins	bob@humanvoicemedia.com	\N	\N	\N	2025-03-27 12:33:20.68122	\N	\N	\N
141	Test11	422ad2ed58f7252523d7acf82dd8cfade6a8f0e978d3c4d65a8e967a432b1ac9bf1c7381b5d62375edd295c9b7c42f0ffa7c4ab28a55102d66b63333f573ac49.1729eb78cd8811568f1a0ca01ede9435	\N	\N	2025-03-27 13:00:23.779695+00	2025-03-27 13:00:23.779695+00	Test11 user	Test11@gmail.com	\N	\N	\N	2025-03-27 13:00:23.779695	\N	\N	\N
\.


--
-- Data for Name: verified_emails; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.verified_emails (id, user_id, email, verification_token, verification_status, is_domain, dns_records, verified_at, created_at, updated_at) FROM stdin;
1	85	naman@immerzo.io	naman@immerzo.io	verified	f	\N	2025-02-14 10:53:37.759+00	2025-02-13 11:06:20.513174+00	2025-02-14 10:53:37.759+00
2	85	michael@futurzy.com	michael@futurzy.com	verified	f	\N	2025-02-14 10:55:41.469+00	2025-02-14 10:55:07.663812+00	2025-02-14 10:55:41.469+00
\.


--
-- Name: api_keys_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.api_keys_id_seq', 2, true);


--
-- Name: appsumo_codes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.appsumo_codes_id_seq', 7003, true);


--
-- Name: bounce_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.bounce_history_id_seq', 1, false);


--
-- Name: credit_purchases_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.credit_purchases_id_seq', 51, true);


--
-- Name: credit_transactions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.credit_transactions_id_seq', 159, true);


--
-- Name: email_bounces_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.email_bounces_id_seq', 1, false);


--
-- Name: email_events_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.email_events_id_seq', 1, false);


--
-- Name: email_retries_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.email_retries_id_seq', 1, false);


--
-- Name: email_tracking_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.email_tracking_id_seq', 1, false);


--
-- Name: form_styles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.form_styles_id_seq', 1, false);


--
-- Name: gmail_oauth_settings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.gmail_oauth_settings_id_seq', 1, false);


--
-- Name: gmail_settings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.gmail_settings_id_seq', 1, false);


--
-- Name: google_oauth_settings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.google_oauth_settings_id_seq', 1, false);


--
-- Name: link_clicks_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.link_clicks_id_seq', 1, false);


--
-- Name: newsletter_analytics_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.newsletter_analytics_id_seq', 1, false);


--
-- Name: newsletter_clicks_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.newsletter_clicks_id_seq', 1, false);


--
-- Name: newsletter_metrics_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.newsletter_metrics_id_seq', 1, false);


--
-- Name: newsletter_opens_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.newsletter_opens_id_seq', 1, false);


--
-- Name: newsletter_templates_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.newsletter_templates_id_seq', 1, false);


--
-- Name: newsletters_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.newsletters_id_seq', 79, true);


--
-- Name: notifications_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.notifications_id_seq', 122, true);


--
-- Name: scheduled_emails_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.scheduled_emails_id_seq', 1, false);


--
-- Name: scheduled_newsletters_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.scheduled_newsletters_id_seq', 1, false);


--
-- Name: sent_newsletters_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.sent_newsletters_id_seq', 1, false);


--
-- Name: subscriber_group_members_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.subscriber_group_members_id_seq', 8, true);


--
-- Name: subscriber_groups_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.subscriber_groups_id_seq', 6, true);


--
-- Name: subscribers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.subscribers_id_seq', 56, true);


--
-- Name: tags_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.tags_id_seq', 1, false);


--
-- Name: template_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.template_id_seq', 2, true);


--
-- Name: user_credits_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.user_credits_id_seq', 32, true);


--
-- Name: user_feedback_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.user_feedback_id_seq', 1, false);


--
-- Name: user_redeemed_codes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.user_redeemed_codes_id_seq', 11, true);


--
-- Name: user_subscriptions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.user_subscriptions_id_seq', 30, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.users_id_seq', 141, true);


--
-- Name: verified_emails_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.verified_emails_id_seq', 2, true);


--
-- Name: api_keys api_keys_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.api_keys
    ADD CONSTRAINT api_keys_pkey PRIMARY KEY (id);


--
-- Name: appsumo_codes appsumo_codes_code_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.appsumo_codes
    ADD CONSTRAINT appsumo_codes_code_key UNIQUE (code);


--
-- Name: appsumo_codes appsumo_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.appsumo_codes
    ADD CONSTRAINT appsumo_codes_pkey PRIMARY KEY (id);


--
-- Name: bounce_history bounce_history_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.bounce_history
    ADD CONSTRAINT bounce_history_pkey PRIMARY KEY (id);


--
-- Name: credit_purchases credit_purchases_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.credit_purchases
    ADD CONSTRAINT credit_purchases_pkey PRIMARY KEY (id);


--
-- Name: credit_purchases credit_purchases_stripe_session_id_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.credit_purchases
    ADD CONSTRAINT credit_purchases_stripe_session_id_key UNIQUE (stripe_session_id);


--
-- Name: credit_transactions credit_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.credit_transactions
    ADD CONSTRAINT credit_transactions_pkey PRIMARY KEY (id);


--
-- Name: email_bounces email_bounces_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.email_bounces
    ADD CONSTRAINT email_bounces_pkey PRIMARY KEY (id);


--
-- Name: email_events email_events_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.email_events
    ADD CONSTRAINT email_events_pkey PRIMARY KEY (id);


--
-- Name: email_retries email_retries_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.email_retries
    ADD CONSTRAINT email_retries_pkey PRIMARY KEY (id);


--
-- Name: email_tracking email_tracking_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.email_tracking
    ADD CONSTRAINT email_tracking_pkey PRIMARY KEY (id);


--
-- Name: form_styles form_styles_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.form_styles
    ADD CONSTRAINT form_styles_pkey PRIMARY KEY (id);


--
-- Name: gmail_oauth_settings gmail_oauth_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.gmail_oauth_settings
    ADD CONSTRAINT gmail_oauth_settings_pkey PRIMARY KEY (id);


--
-- Name: gmail_oauth_settings gmail_oauth_settings_user_id_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.gmail_oauth_settings
    ADD CONSTRAINT gmail_oauth_settings_user_id_key UNIQUE (user_id);


--
-- Name: gmail_settings gmail_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.gmail_settings
    ADD CONSTRAINT gmail_settings_pkey PRIMARY KEY (id);


--
-- Name: google_oauth_settings google_oauth_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.google_oauth_settings
    ADD CONSTRAINT google_oauth_settings_pkey PRIMARY KEY (id);


--
-- Name: link_clicks link_clicks_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.link_clicks
    ADD CONSTRAINT link_clicks_pkey PRIMARY KEY (id);


--
-- Name: newsletter_analytics newsletter_analytics_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.newsletter_analytics
    ADD CONSTRAINT newsletter_analytics_pkey PRIMARY KEY (id);


--
-- Name: newsletter_clicks newsletter_clicks_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.newsletter_clicks
    ADD CONSTRAINT newsletter_clicks_pkey PRIMARY KEY (id);


--
-- Name: newsletter_metrics newsletter_metrics_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.newsletter_metrics
    ADD CONSTRAINT newsletter_metrics_pkey PRIMARY KEY (id);


--
-- Name: newsletter_opens newsletter_opens_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.newsletter_opens
    ADD CONSTRAINT newsletter_opens_pkey PRIMARY KEY (id);


--
-- Name: newsletter_templates newsletter_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.newsletter_templates
    ADD CONSTRAINT newsletter_templates_pkey PRIMARY KEY (id);


--
-- Name: newsletters newsletters_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.newsletters
    ADD CONSTRAINT newsletters_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: scheduled_emails scheduled_emails_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.scheduled_emails
    ADD CONSTRAINT scheduled_emails_pkey PRIMARY KEY (id);


--
-- Name: scheduled_newsletters scheduled_newsletters_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.scheduled_newsletters
    ADD CONSTRAINT scheduled_newsletters_pkey PRIMARY KEY (id);


--
-- Name: sent_newsletters sent_newsletters_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.sent_newsletters
    ADD CONSTRAINT sent_newsletters_pkey PRIMARY KEY (id);


--
-- Name: subscriber_group_members subscriber_group_members_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.subscriber_group_members
    ADD CONSTRAINT subscriber_group_members_pkey PRIMARY KEY (id);


--
-- Name: subscriber_groups subscriber_groups_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.subscriber_groups
    ADD CONSTRAINT subscriber_groups_pkey PRIMARY KEY (id);


--
-- Name: subscriber_tags subscriber_tags_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.subscriber_tags
    ADD CONSTRAINT subscriber_tags_pkey PRIMARY KEY (subscriber_id, tag_id);


--
-- Name: subscribers subscribers_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.subscribers
    ADD CONSTRAINT subscribers_pkey PRIMARY KEY (id);


--
-- Name: tags tags_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.tags
    ADD CONSTRAINT tags_pkey PRIMARY KEY (id);


--
-- Name: tags tags_user_id_name_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.tags
    ADD CONSTRAINT tags_user_id_name_key UNIQUE (user_id, name);


--
-- Name: templates templates_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.templates
    ADD CONSTRAINT templates_pkey PRIMARY KEY (id);


--
-- Name: user_credits user_credits_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.user_credits
    ADD CONSTRAINT user_credits_pkey PRIMARY KEY (id);


--
-- Name: user_credits user_credits_user_id_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.user_credits
    ADD CONSTRAINT user_credits_user_id_key UNIQUE (user_id);


--
-- Name: user_feedback user_feedback_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.user_feedback
    ADD CONSTRAINT user_feedback_pkey PRIMARY KEY (id);


--
-- Name: user_redeemed_codes user_redeemed_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.user_redeemed_codes
    ADD CONSTRAINT user_redeemed_codes_pkey PRIMARY KEY (id);


--
-- Name: user_subscriptions user_subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.user_subscriptions
    ADD CONSTRAINT user_subscriptions_pkey PRIMARY KEY (id);


--
-- Name: users users_clerk_user_id_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_clerk_user_id_key UNIQUE (clerk_user_id);


--
-- Name: users users_email_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_unique UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_unique UNIQUE (username);


--
-- Name: verified_emails verified_emails_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.verified_emails
    ADD CONSTRAINT verified_emails_pkey PRIMARY KEY (id);


--
-- Name: verified_emails verified_emails_user_id_email_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.verified_emails
    ADD CONSTRAINT verified_emails_user_id_email_key UNIQUE (user_id, email);


--
-- Name: google_oauth_settings_user_id_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX google_oauth_settings_user_id_idx ON public.google_oauth_settings USING btree (user_id);


--
-- Name: idx_appsumo_codes_is_redeemed; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_appsumo_codes_is_redeemed ON public.appsumo_codes USING btree (is_redeemed);


--
-- Name: idx_bounce_history_newsletter; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_bounce_history_newsletter ON public.bounce_history USING btree (newsletter_id);


--
-- Name: idx_bounce_history_subscriber; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_bounce_history_subscriber ON public.bounce_history USING btree (subscriber_id);


--
-- Name: idx_credit_purchases_session; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_credit_purchases_session ON public.credit_purchases USING btree (stripe_session_id);


--
-- Name: idx_credit_purchases_status; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_credit_purchases_status ON public.credit_purchases USING btree (status);


--
-- Name: idx_credit_purchases_user; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_credit_purchases_user ON public.credit_purchases USING btree (user_id);


--
-- Name: idx_credit_transactions_type; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_credit_transactions_type ON public.credit_transactions USING btree (type);


--
-- Name: idx_credit_transactions_user_id_created; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_credit_transactions_user_id_created ON public.credit_transactions USING btree (user_id, created_at);


--
-- Name: idx_email_bounces_email; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_email_bounces_email ON public.email_bounces USING btree (email);


--
-- Name: idx_email_bounces_newsletter; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_email_bounces_newsletter ON public.email_bounces USING btree (newsletter_id);


--
-- Name: idx_email_retries_next_attempt; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_email_retries_next_attempt ON public.email_retries USING btree (next_attempt_at);


--
-- Name: idx_email_retries_status; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_email_retries_status ON public.email_retries USING btree (status);


--
-- Name: idx_email_tracking_email; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_email_tracking_email ON public.email_tracking USING btree (recipient_email);


--
-- Name: idx_email_tracking_newsletter; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_email_tracking_newsletter ON public.email_tracking USING btree (newsletter_id);


--
-- Name: idx_email_tracking_recipient; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_email_tracking_recipient ON public.email_tracking USING btree (recipient_email);


--
-- Name: idx_form_styles_user_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_form_styles_user_id ON public.form_styles USING btree (user_id);


--
-- Name: idx_gmail_settings_user_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_gmail_settings_user_id ON public.gmail_settings USING btree (user_id);


--
-- Name: idx_google_oauth_expires_at; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_google_oauth_expires_at ON public.google_oauth_settings USING btree (expires_at);


--
-- Name: idx_google_oauth_user_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_google_oauth_user_id ON public.google_oauth_settings USING btree (user_id);


--
-- Name: idx_newsletter_analytics_created_at; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_newsletter_analytics_created_at ON public.newsletter_analytics USING btree (created_at);


--
-- Name: idx_newsletter_analytics_event_type; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_newsletter_analytics_event_type ON public.newsletter_analytics USING btree (event_type);


--
-- Name: idx_newsletter_analytics_newsletter_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_newsletter_analytics_newsletter_id ON public.newsletter_analytics USING btree (newsletter_id);


--
-- Name: idx_newsletter_clicks_newsletter_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_newsletter_clicks_newsletter_id ON public.newsletter_clicks USING btree (newsletter_id);


--
-- Name: idx_newsletter_clicks_subscriber_email; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_newsletter_clicks_subscriber_email ON public.newsletter_clicks USING btree (subscriber_email);


--
-- Name: idx_newsletter_metrics_newsletter_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_newsletter_metrics_newsletter_id ON public.newsletter_metrics USING btree (newsletter_id);


--
-- Name: idx_newsletter_opens_newsletter_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_newsletter_opens_newsletter_id ON public.newsletter_opens USING btree (newsletter_id);


--
-- Name: idx_newsletter_opens_subscriber_email; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_newsletter_opens_subscriber_email ON public.newsletter_opens USING btree (subscriber_email);


--
-- Name: idx_subscriber_group_members_group; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_subscriber_group_members_group ON public.subscriber_group_members USING btree (group_id);


--
-- Name: idx_subscriber_group_members_group_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_subscriber_group_members_group_id ON public.subscriber_group_members USING btree (group_id);


--
-- Name: idx_subscriber_group_members_subscriber; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_subscriber_group_members_subscriber ON public.subscriber_group_members USING btree (subscriber_id);


--
-- Name: idx_subscriber_group_members_subscriber_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_subscriber_group_members_subscriber_id ON public.subscriber_group_members USING btree (subscriber_id);


--
-- Name: idx_subscriber_groups_user_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_subscriber_groups_user_id ON public.subscriber_groups USING btree (user_id);


--
-- Name: idx_subscriber_tags_subscriber_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_subscriber_tags_subscriber_id ON public.subscriber_tags USING btree (subscriber_id);


--
-- Name: idx_subscriber_tags_tag_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_subscriber_tags_tag_id ON public.subscriber_tags USING btree (tag_id);


--
-- Name: idx_unique_group_member; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX idx_unique_group_member ON public.subscriber_group_members USING btree (group_id, subscriber_id);


--
-- Name: idx_unique_group_membership; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX idx_unique_group_membership ON public.subscriber_group_members USING btree (subscriber_id, group_id);


--
-- Name: idx_user_credits_user_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_user_credits_user_id ON public.user_credits USING btree (user_id);


--
-- Name: idx_user_subscriptions_limits; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_user_subscriptions_limits ON public.user_subscriptions USING btree (user_id, initial_ai_credits, subscriber_limit);


--
-- Name: idx_user_subscriptions_provider; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_user_subscriptions_provider ON public.user_subscriptions USING btree (provider);


--
-- Name: idx_user_subscriptions_status; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_user_subscriptions_status ON public.user_subscriptions USING btree (status);


--
-- Name: idx_user_subscriptions_stripe_customer; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_user_subscriptions_stripe_customer ON public.user_subscriptions USING btree (stripe_customer_id);


--
-- Name: idx_user_subscriptions_stripe_subscription; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_user_subscriptions_stripe_subscription ON public.user_subscriptions USING btree (stripe_subscription_id);


--
-- Name: idx_users_clerk_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_users_clerk_id ON public.users USING btree (clerk_user_id);


--
-- Name: idx_users_created_at; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_users_created_at ON public.users USING btree (created_at);


--
-- Name: idx_users_username; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_users_username ON public.users USING btree (username);


--
-- Name: idx_verified_emails_status; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_verified_emails_status ON public.verified_emails USING btree (verification_status);


--
-- Name: idx_verified_emails_user_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_verified_emails_user_id ON public.verified_emails USING btree (user_id);


--
-- Name: api_keys api_keys_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.api_keys
    ADD CONSTRAINT api_keys_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: appsumo_codes appsumo_codes_redeemed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.appsumo_codes
    ADD CONSTRAINT appsumo_codes_redeemed_by_fkey FOREIGN KEY (redeemed_by) REFERENCES public.users(id);


--
-- Name: credit_purchases credit_purchases_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.credit_purchases
    ADD CONSTRAINT credit_purchases_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: credit_transactions credit_transactions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.credit_transactions
    ADD CONSTRAINT credit_transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: email_events email_events_newsletter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.email_events
    ADD CONSTRAINT email_events_newsletter_id_fkey FOREIGN KEY (newsletter_id) REFERENCES public.newsletters(id);


--
-- Name: email_retries email_retries_newsletter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.email_retries
    ADD CONSTRAINT email_retries_newsletter_id_fkey FOREIGN KEY (newsletter_id) REFERENCES public.newsletters(id);


--
-- Name: email_tracking email_tracking_newsletter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.email_tracking
    ADD CONSTRAINT email_tracking_newsletter_id_fkey FOREIGN KEY (newsletter_id) REFERENCES public.newsletters(id);


--
-- Name: email_bounces fk_newsletter; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.email_bounces
    ADD CONSTRAINT fk_newsletter FOREIGN KEY (newsletter_id) REFERENCES public.newsletters(id) ON DELETE CASCADE;


--
-- Name: bounce_history fk_newsletter; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.bounce_history
    ADD CONSTRAINT fk_newsletter FOREIGN KEY (newsletter_id) REFERENCES public.newsletters(id) ON DELETE CASCADE;


--
-- Name: bounce_history fk_subscriber; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.bounce_history
    ADD CONSTRAINT fk_subscriber FOREIGN KEY (subscriber_id) REFERENCES public.subscribers(id) ON DELETE CASCADE;


--
-- Name: form_styles form_styles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.form_styles
    ADD CONSTRAINT form_styles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: gmail_oauth_settings gmail_oauth_settings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.gmail_oauth_settings
    ADD CONSTRAINT gmail_oauth_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: gmail_settings gmail_settings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.gmail_settings
    ADD CONSTRAINT gmail_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: google_oauth_settings google_oauth_settings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.google_oauth_settings
    ADD CONSTRAINT google_oauth_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: link_clicks link_clicks_newsletter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.link_clicks
    ADD CONSTRAINT link_clicks_newsletter_id_fkey FOREIGN KEY (newsletter_id) REFERENCES public.newsletters(id);


--
-- Name: newsletter_analytics newsletter_analytics_newsletter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.newsletter_analytics
    ADD CONSTRAINT newsletter_analytics_newsletter_id_fkey FOREIGN KEY (newsletter_id) REFERENCES public.newsletters(id);


--
-- Name: newsletter_clicks newsletter_clicks_newsletter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.newsletter_clicks
    ADD CONSTRAINT newsletter_clicks_newsletter_id_fkey FOREIGN KEY (newsletter_id) REFERENCES public.newsletters(id);


--
-- Name: newsletter_metrics newsletter_metrics_newsletter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.newsletter_metrics
    ADD CONSTRAINT newsletter_metrics_newsletter_id_fkey FOREIGN KEY (newsletter_id) REFERENCES public.newsletters(id);


--
-- Name: newsletter_opens newsletter_opens_newsletter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.newsletter_opens
    ADD CONSTRAINT newsletter_opens_newsletter_id_fkey FOREIGN KEY (newsletter_id) REFERENCES public.newsletters(id);


--
-- Name: newsletters newsletters_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.newsletters
    ADD CONSTRAINT newsletters_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.templates(id);


--
-- Name: newsletters newsletters_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.newsletters
    ADD CONSTRAINT newsletters_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: scheduled_newsletters scheduled_newsletters_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.scheduled_newsletters
    ADD CONSTRAINT scheduled_newsletters_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: sent_newsletters sent_newsletters_newsletter_id_newsletters_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.sent_newsletters
    ADD CONSTRAINT sent_newsletters_newsletter_id_newsletters_id_fk FOREIGN KEY (newsletter_id) REFERENCES public.newsletters(id);


--
-- Name: subscriber_group_members subscriber_group_members_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.subscriber_group_members
    ADD CONSTRAINT subscriber_group_members_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.subscriber_groups(id) ON DELETE CASCADE;


--
-- Name: subscriber_group_members subscriber_group_members_subscriber_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.subscriber_group_members
    ADD CONSTRAINT subscriber_group_members_subscriber_id_fkey FOREIGN KEY (subscriber_id) REFERENCES public.subscribers(id) ON DELETE CASCADE;


--
-- Name: subscriber_groups subscriber_groups_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.subscriber_groups
    ADD CONSTRAINT subscriber_groups_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: subscriber_tags subscriber_tags_subscriber_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.subscriber_tags
    ADD CONSTRAINT subscriber_tags_subscriber_id_fkey FOREIGN KEY (subscriber_id) REFERENCES public.subscribers(id) ON DELETE CASCADE;


--
-- Name: subscriber_tags subscriber_tags_tag_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.subscriber_tags
    ADD CONSTRAINT subscriber_tags_tag_id_fkey FOREIGN KEY (tag_id) REFERENCES public.tags(id) ON DELETE CASCADE;


--
-- Name: subscribers subscribers_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.subscribers
    ADD CONSTRAINT subscribers_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: tags tags_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.tags
    ADD CONSTRAINT tags_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: templates templates_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.templates
    ADD CONSTRAINT templates_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: user_credits user_credits_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.user_credits
    ADD CONSTRAINT user_credits_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: user_feedback user_feedback_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.user_feedback
    ADD CONSTRAINT user_feedback_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: user_redeemed_codes user_redeemed_codes_code_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.user_redeemed_codes
    ADD CONSTRAINT user_redeemed_codes_code_id_fkey FOREIGN KEY (code_id) REFERENCES public.appsumo_codes(id);


--
-- Name: user_redeemed_codes user_redeemed_codes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.user_redeemed_codes
    ADD CONSTRAINT user_redeemed_codes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: user_subscriptions user_subscriptions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.user_subscriptions
    ADD CONSTRAINT user_subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: verified_emails verified_emails_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.verified_emails
    ADD CONSTRAINT verified_emails_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: cloud_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO neon_superuser WITH GRANT OPTION;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: cloud_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public GRANT ALL ON TABLES TO neon_superuser WITH GRANT OPTION;


--
-- PostgreSQL database dump complete
--

