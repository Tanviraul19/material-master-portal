-- Update Material Master Portal Schema for Extended RBAC

-- Drop existing types to recreate with new roles
DROP TABLE IF EXISTS approval_logs;
DROP TABLE IF EXISTS material_requests;
DROP TABLE IF EXISTS users;
DROP TYPE IF EXISTS user_role;
DROP TYPE IF EXISTS request_status;

CREATE TYPE user_role AS ENUM (
    'Super Admin', 
    'User', 
    'Plant Head', 
    'Mechanical Team', 
    'Electrical Team', 
    'Consumable Team', 
    'Production Team', 
    'Packaging Team', 
    'Purchase Team', 
    'GST Team', 
    'Store Head', 
    'IT Team'
);

CREATE TYPE request_status AS ENUM ('pending', 'approved', 'rejected', 'info_required');

-- Users Table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    full_name VARCHAR(100),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role user_role DEFAULT 'User',
    department VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP WITH TIME ZONE
);

-- Material Requests Table
CREATE TABLE material_requests (
    id SERIAL PRIMARY KEY,
    req_number VARCHAR(50) UNIQUE NOT NULL,
    requester_id INTEGER REFERENCES users(id),
    material_name VARCHAR(255) NOT NULL, -- Short description
    material_type VARCHAR(50),
    plant VARCHAR(20),
    storage_location VARCHAR(20),
    description VARCHAR(40), -- Short SAP description
    long_description VARCHAR(200),
    uom VARCHAR(20),
    purchase_group VARCHAR(20),
    material_group VARCHAR(20),
    control_code VARCHAR(50),
    valuation_category VARCHAR(10),
    valuation_class VARCHAR(10),
    status request_status DEFAULT 'pending',
    current_stage user_role, -- Which role currently needs to approve
    priority VARCHAR(20) DEFAULT 'medium',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Approval Workflow History
CREATE TABLE approval_logs (
    id SERIAL PRIMARY KEY,
    request_id INTEGER REFERENCES material_requests(id) ON DELETE CASCADE,
    approver_id INTEGER REFERENCES users(id),
    from_status request_status,
    to_status request_status,
    comments TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Initial Mock Data (Passwords: 'password123')
-- Note: In production, these should be hashed via the backend seed script
INSERT INTO users (full_name, username, email, password_hash, role, department) VALUES
('Saurabh', 'saurabh_admin', 'saurabh@enterprise.com', '$2a$10$YourHashedPassword', 'Super Admin', 'Management'),
('Komal', 'komal_admin', 'komal@enterprise.com', '$2a$10$YourHashedPassword', 'Super Admin', 'Management'),
('John Doe', 'john_user', 'john@enterprise.com', '$2a$10$YourHashedPassword', 'User', 'Production');
