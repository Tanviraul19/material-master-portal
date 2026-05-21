const { MaterialRequest, ApprovalHistory, User } = require('../models');
const { normalizeDescription, MATERIAL_TYPE_MAPPING } = require('../utils/helpers');
const { Op } = require('sequelize');

exports.createRequest = async (req, res) => {
  try {
    const { 
      material_type, plant, storage_location, description, 
      long_description, uom, purchase_group, material_group, control_code 
    } = req.body;

    const normalized = normalizeDescription(description);

    // Check for duplicates
    const duplicate = await MaterialRequest.findOne({
      where: { normalized_description: normalized }
    });

    if (duplicate) {
      return res.status(400).json({ 
        message: 'This material description already exists.',
        similar: [duplicate]
      });
    }

    const mapping = MATERIAL_TYPE_MAPPING[material_type] || {};

    const request = await MaterialRequest.create({
      material_type,
      plant,
      storage_location,
      description,
      normalized_description: normalized,
      long_description,
      uom,
      purchase_group,
      material_group,
      control_code,
      valuation_category: mapping.valuation_category,
      valuation_class: mapping.valuation_class,
      department: mapping.department,
      status: 'PENDING_PLANT_HEAD',
      current_approver_role: 'PLANT_HEAD',
      created_by: req.user.id
    });

    await ApprovalHistory.create({
      request_id: request.id,
      action: 'SUBMITTED',
      remarks: 'Request raised by user',
      role: 'USER',
      actor_id: req.user.id
    });

    res.status(201).json(request);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getRequests = async (req, res) => {
  try {
    const { role, id } = req.user;
    let where = {};

    if (role === 'USER') {
      where = { created_by: id };
    } else if (role !== 'ADMIN') {
      // Approvers see what's pending for them or what they've historical access to
      // For simplicity, we show all pending for their role
      where = { current_approver_role: role };
    }

    const requests = await MaterialRequest.findAll({ 
      where,
      include: [{ model: User, as: 'Creator', attributes: ['name'] }]
    });
    res.json(requests);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.approveRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, remarks, updates } = req.body; // action: APPROVE, REJECT, SEND_BACK
    const request = await MaterialRequest.findByPk(id);

    if (!request) return res.status(404).json({ message: 'Request not found' });

    let nextStatus = request.status;
    let nextApprover = request.current_approver_role;

    if (action === 'REJECT') {
      nextStatus = 'REJECTED';
      nextApprover = null;
    } else if (action === 'SEND_BACK') {
      nextStatus = 'CHANGES_REQUESTED';
      nextApprover = 'USER';
    } else if (action === 'APPROVE') {
      // Workflow logic
      switch (request.status) {
        case 'PENDING_PLANT_HEAD':
          nextStatus = 'PENDING_DEPT';
          nextApprover = 'DEPT_TEAM';
          break;
        case 'PENDING_DEPT':
          nextStatus = 'PENDING_PURCHASE';
          nextApprover = 'PURCHASE_TEAM';
          break;
        case 'PENDING_PURCHASE':
          nextStatus = 'PENDING_GST';
          nextApprover = 'GST_TEAM';
          break;
        case 'PENDING_GST':
          // If GST edits description or control code (handled in updates)
          if (updates && (updates.description || updates.control_code)) {
             request.description = updates.description || request.description;
             request.control_code = updates.control_code || request.control_code;
             request.normalized_description = normalizeDescription(request.description);
             nextStatus = 'PENDING_PLANT_HEAD'; // Restart
             nextApprover = 'PLANT_HEAD';
          } else {
             nextStatus = 'PENDING_STORE_HEAD';
             nextApprover = 'STORE_HEAD';
          }
          break;
        case 'PENDING_STORE_HEAD':
          // If Store Head edits material type etc.
          if (updates && (updates.material_type || updates.description || updates.material_group)) {
             const mapping = MATERIAL_TYPE_MAPPING[updates.material_type] || MATERIAL_TYPE_MAPPING[request.material_type];
             request.material_type = updates.material_type || request.material_type;
             request.description = updates.description || request.description;
             request.material_group = updates.material_group || request.material_group;
             request.department = mapping.department;
             request.valuation_category = mapping.valuation_category;
             request.valuation_class = mapping.valuation_class;
             request.normalized_description = normalizeDescription(request.description);
             
             nextStatus = 'PENDING_PLANT_HEAD'; // Restart/Re-route
             nextApprover = 'PLANT_HEAD';
          } else {
             nextStatus = 'PENDING_IT';
             nextApprover = 'IT_TEAM';
          }
          break;
        case 'PENDING_IT':
          nextStatus = 'APPROVED';
          nextApprover = null;
          break;
      }
    }

    request.status = nextStatus;
    request.current_approver_role = nextApprover;
    await request.save();

    await ApprovalHistory.create({
      request_id: request.id,
      action: action,
      remarks,
      role: req.user.role,
      actor_id: req.user.id
    });

    res.json(request);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
