-- PostgreSQL Schema for Material Master Portal

-- 1. Users Table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(20) NOT NULL, -- Super Admin, User, Plant Head, etc.
    department VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP WITH TIME ZONE
);

-- 2. Material Requests Table
CREATE TABLE material_requests (
    id SERIAL PRIMARY KEY,
    req_number VARCHAR(20) UNIQUE NOT NULL,
    requester_id INTEGER REFERENCES users(id),
    material_type VARCHAR(10) NOT NULL,
    plant VARCHAR(10) NOT NULL,
    storage_location VARCHAR(10) NOT NULL,
    description VARCHAR(40) NOT NULL,
    long_description TEXT,
    uom VARCHAR(10) NOT NULL,
    purchase_group VARCHAR(20),
    material_group VARCHAR(20),
    control_code VARCHAR(50),
    valuation_category VARCHAR(10),
    valuation_class VARCHAR(10),
    department VARCHAR(50),
    status VARCHAR(50) DEFAULT 'Pending Plant Head',
    current_stage VARCHAR(50) DEFAULT 'Plant Head',
    priority VARCHAR(10) DEFAULT 'Medium',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Approval History (Step-by-step audit)
CREATE TABLE approval_history (
    id SERIAL PRIMARY KEY,
    request_id INTEGER REFERENCES material_requests(id) ON DELETE CASCADE,
    approver_id INTEGER REFERENCES users(id),
    action VARCHAR(20) NOT NULL, -- APPROVED, REJECTED, SENT_BACK, EDITED
    stage VARCHAR(50) NOT NULL,
    comments TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Activity Logs (System-wide audit trail)
CREATE TABLE activity_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    action_type VARCHAR(50) NOT NULL, -- LOGIN, USER_CREATE, MATERIAL_UPDATE, etc.
    description TEXT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Notifications
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    request_id INTEGER REFERENCES material_requests(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- PENDING_APPROVAL, STATUS_CHANGE
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_requests_status ON material_requests(status);
CREATE INDEX idx_requests_requester ON material_requests(requester_id);
CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);
