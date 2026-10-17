const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

async function main() {
  const client = await pool.connect();
  try {
    // 1. Notification Templates
    console.log('Seeding notification templates...');
    const templates = [
      { code: 'RESERVATION_CONFIRMATION', name: 'Reservation Confirmation', channel: 'email', type: 'reservation_confirmation', subject: 'Your Reservation Confirmation - {{reservationNumber}}', body: 'Dear {{guestName}},\n\nYour reservation {{reservationNumber}} has been confirmed.\nCheck-in: {{checkInDate}}\nCheck-out: {{checkOutDate}}\nRoom: {{roomNumber}}\n\nThank you for choosing us!', variables: JSON.stringify(['guestName','reservationNumber','checkInDate','checkOutDate','roomNumber']) },
      { code: 'CHECKIN_REMINDER', name: 'Check-in Reminder', channel: 'email', type: 'checkin_reminder', subject: 'Your Check-in Tomorrow - {{reservationNumber}}', body: 'Dear {{guestName}},\n\nThis is a reminder that your check-in is scheduled for tomorrow, {{checkInDate}}.\nPlease arrive after {{checkInTime}}.\n\nWe look forward to welcoming you!', variables: JSON.stringify(['guestName','reservationNumber','checkInDate','checkInTime']) },
      { code: 'CHECKOUT_REMINDER', name: 'Check-out Reminder', channel: 'in_app', type: 'checkout_reminder', subject: 'Check-out Reminder', body: 'Dear {{guestName}}, your check-out is scheduled for today at {{checkOutTime}}. Please proceed to the front desk.', variables: JSON.stringify(['guestName','checkOutTime']) },
      { code: 'PAYMENT_REMINDER', name: 'Payment Reminder', channel: 'email', type: 'payment_reminder', subject: 'Payment Due - Invoice {{invoiceNumber}}', body: 'Dear {{guestName}},\n\nThis is a reminder that invoice {{invoiceNumber}} for amount {{amount}} is due on {{dueDate}}.\n\nPlease make payment at your earliest convenience.', variables: JSON.stringify(['guestName','invoiceNumber','amount','dueDate']) },
      { code: 'INVOICE_GENERATED', name: 'Invoice Generated', channel: 'email', type: 'invoice_generated', subject: 'Invoice {{invoiceNumber}} Generated', body: 'Dear {{guestName}},\n\nYour invoice {{invoiceNumber}} for {{amount}} has been generated.\n\nThank you for your stay!', variables: JSON.stringify(['guestName','invoiceNumber','amount']) },
      { code: 'COMPLAINT_RECEIVED', name: 'Complaint Received', channel: 'in_app', type: 'complaint_received', subject: 'Complaint Received - {{complaintNumber}}', body: 'Your complaint {{complaintNumber}} has been received and is being reviewed. We will respond within 24 hours.', variables: JSON.stringify(['complaintNumber','guestName']) },
      { code: 'COMPLAINT_RESOLVED', name: 'Complaint Resolved', channel: 'email', type: 'complaint_resolved', subject: 'Your Complaint Has Been Resolved - {{complaintNumber}}', body: 'Dear {{guestName}},\n\nYour complaint {{complaintNumber}} has been resolved.\n\nResolution: {{resolutionNotes}}\n\nWe apologize for any inconvenience.', variables: JSON.stringify(['guestName','complaintNumber','resolutionNotes']) },
      { code: 'LOW_STOCK_ALERT', name: 'Low Stock Alert', channel: 'in_app', type: 'low_stock_alert', subject: 'Low Stock Alert: {{itemName}}', body: 'Alert: {{itemName}} is running low. Current stock: {{currentStock}} {{unit}}. Minimum required: {{minStock}} {{unit}}. Please reorder.', variables: JSON.stringify(['itemName','currentStock','minStock','unit']) },
      { code: 'LEAVE_APPROVED', name: 'Leave Approved', channel: 'in_app', type: 'leave_approved', subject: 'Your Leave Request Has Been Approved', body: 'Dear {{employeeName}}, your leave request from {{startDate}} to {{endDate}} has been approved by {{approvedBy}}.', variables: JSON.stringify(['employeeName','startDate','endDate','approvedBy']) },
      { code: 'CONFERENCE_REMINDER', name: 'Conference Booking Reminder', channel: 'email', type: 'conference_reminder', subject: 'Conference Booking Reminder - {{bookingNumber}}', body: 'Dear {{customerName}},\n\nThis is a reminder that your event "{{eventName}}" is scheduled for {{bookingDate}} at {{startTime}} in {{hallName}}.\n\nAttendees: {{attendees}}\n\nPlease contact us if you need any changes.', variables: JSON.stringify(['customerName','bookingNumber','eventName','bookingDate','startTime','hallName','attendees']) },
    ];

    for (const t of templates) {
      await client.query(
        `INSERT INTO notification_templates (id, code, name, channel, type, subject, body, variables, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, NOW(), NOW())
         ON CONFLICT (code) DO UPDATE SET name=EXCLUDED.name, body=EXCLUDED.body, updated_at=NOW()`,
        [uuid(), t.code, t.name, t.channel, t.type, t.subject, t.body, t.variables]
      );
    }
    console.log('✓ Notification templates seeded');

    // 2. Complaints
    console.log('Seeding complaints...');
    const categories = ['room', 'restaurant', 'billing', 'staff', 'housekeeping', 'maintenance', 'transport', 'conference', 'general'];
    const priorities = ['low', 'medium', 'high', 'critical'];
    const statuses = ['new', 'assigned', 'in_progress', 'resolved', 'closed', 'rejected', 'escalated'];
    const subjects = {
      room: ['Room not cleaned properly', 'Air conditioning not working', 'TV remote missing', 'Noisy neighbors', 'Broken door lock', 'No hot water'],
      restaurant: ['Food was cold', 'Wrong order delivered', 'Long wait time', 'Food quality below expectations', 'Missing items in order'],
      billing: ['Incorrect charge on bill', 'Double charged for service', 'Refund not processed', 'Unexpected fees'],
      staff: ['Rude staff member', 'Slow service', 'Staff not helpful', 'Unprofessional behavior'],
      housekeeping: ['Room not serviced', 'Towels not replaced', 'Dirty bathroom', 'Bed not made'],
      maintenance: ['Leaking faucet', 'Light bulb out', 'Shower not working', 'Elevator issue'],
      transport: ['Driver was late', 'Vehicle was dirty', 'Wrong destination', 'Overcharged for transport'],
      conference: ['AV equipment not working', 'Room setup incorrect', 'Catering not as ordered'],
      general: ['WiFi not working', 'Pool area dirty', 'Gym equipment broken', 'Lost item not found'],
    };

    const guestNames = ['John Smith', 'Mary Johnson', 'Robert Williams', 'Patricia Brown', 'James Davis', 'Linda Miller', 'Michael Wilson', 'Barbara Moore', 'William Taylor', 'Elizabeth Anderson', 'David Jackson', 'Jennifer White', 'Richard Harris', 'Susan Martin', 'Joseph Thompson', 'Jessica Garcia', 'Thomas Martinez', 'Sarah Rodriguez', 'Charles Lewis', 'Karen Lee'];

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const now = new Date();

    const complaintIds = [];
    for (let i = 0; i < 300; i++) {
      const id = uuid();
      const category = randomItem(categories);
      const status = randomItem(statuses);
      const priority = randomItem(priorities);
      const guestName = randomItem(guestNames);
      const subject = randomItem(subjects[category]);
      const createdAt = randomDate(sixMonthsAgo, now);
      const complaintNumber = 'CMP-' + (Date.now() + i).toString(36).toUpperCase();
      const satisfactionRating = ['resolved', 'closed'].includes(status) && Math.random() > 0.3 ? Math.floor(Math.random() * 5) + 1 : null;
      const resolvedAt = ['resolved', 'closed'].includes(status) ? new Date(createdAt.getTime() + Math.random() * 86400000 * 3) : null;

      await client.query(
        `INSERT INTO complaints (id, complaint_number, guest_name, guest_email, category, priority, subject, description, status, satisfaction_rating, resolved_at, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, true, $12, $12)`,
        [
          id, complaintNumber, guestName,
          guestName.toLowerCase().replace(' ', '.') + '@example.com',
          category, priority, subject,
          `The guest reported: ${subject}. This requires immediate attention.`,
          status, satisfactionRating, resolvedAt, createdAt
        ]
      );
      complaintIds.push({ id, createdAt });
    }
    console.log('✓ Complaints seeded');

    // 3. Complaint Comments
    console.log('Seeding complaint comments...');
    const staffNames = ['Front Desk Agent', 'Manager on Duty', 'Supervisor', 'Customer Service Team'];
    for (const { id: complaintId, createdAt } of complaintIds) {
      const commentCount = Math.floor(Math.random() * 2) + 2; // 2-3 comments
      for (let j = 0; j < commentCount; j++) {
        const commentDate = new Date(createdAt.getTime() + (j + 1) * 3600000);
        const isInternal = j === 0 || Math.random() > 0.5;
        const comments = isInternal
          ? ['Reviewed complaint, escalating to department head', 'Guest contacted, issue acknowledged', 'Working on resolution', 'Parts ordered for repair']
          : ['Thank you for bringing this to our attention', 'We apologize for the inconvenience', 'Issue has been resolved', 'Our team will visit your room shortly'];

        await client.query(
          `INSERT INTO complaint_comments (id, complaint_id, author_name, comment, is_internal, is_active, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, true, $6, $6)`,
          [uuid(), complaintId, randomItem(staffNames), randomItem(comments), isInternal, commentDate]
        );
      }
    }
    console.log('✓ Complaint comments seeded');

    // 4. Notifications
    console.log('Seeding notifications...');
    // Get first admin user
    const userResult = await client.query(`SELECT id FROM users WHERE is_active = true ORDER BY created_at LIMIT 1`);
    if (userResult.rows.length > 0) {
      const userId = userResult.rows[0].id;
      const notifTypes = ['info', 'warning', 'success', 'error', 'reservation', 'payment', 'housekeeping', 'maintenance', 'complaint'];
      const notifMessages = [
        { type: 'reservation', title: 'New Reservation', message: 'A new reservation has been created for room 101' },
        { type: 'payment', title: 'Payment Received', message: 'Payment of $250 received for invoice INV-001' },
        { type: 'housekeeping', title: 'Room Ready', message: 'Room 205 has been cleaned and is ready for check-in' },
        { type: 'maintenance', title: 'Maintenance Request', message: 'New maintenance request for room 302 - Leaking faucet' },
        { type: 'complaint', title: 'New Complaint', message: 'Guest complaint received regarding restaurant service' },
        { type: 'info', title: 'System Update', message: 'System maintenance scheduled for Sunday 2:00 AM' },
        { type: 'warning', title: 'Low Stock Alert', message: 'Bedsheets inventory is running low' },
        { type: 'success', title: 'Checkout Complete', message: 'Guest checkout completed successfully for room 401' },
        { type: 'error', title: 'Payment Failed', message: 'Credit card payment failed for reservation RES-12345' },
        { type: 'info', title: 'New Guest Check-in', message: 'Guest John Doe has checked into room 201' },
      ];

      for (let i = 0; i < 500; i++) {
        const notif = randomItem(notifMessages);
        const isRead = Math.random() > 0.4;
        const createdAt = randomDate(sixMonthsAgo, now);

        await client.query(
          `INSERT INTO notifications (id, user_id, type, title, message, is_read, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [uuid(), userId, notif.type, notif.title, notif.message, isRead, createdAt]
        );
      }
      console.log('✓ Notifications seeded');
    } else {
      console.log('⚠ No users found, skipping notifications');
    }

    console.log('\n✅ Phase 6 seed complete!');
  } catch (err) {
    console.error('❌ Seed error:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
