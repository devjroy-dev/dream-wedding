import axios from 'axios';

const API_URL = 'https://dream-wedding-production-89ae.up.railway.app/api';

const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
});

// ==================
// VENDORS
// ==================

export const getVendors = async (category?: string, city?: string) => {
  const params: any = {};
  if (category) params.category = category;
  if (city) params.city = city;
  const response = await api.get('/vendors', { params });
  return response.data;
};

export const getVendor = async (id: string) => {
  const response = await api.get(`/vendors/${id}`);
  return response.data;
};

export const createVendor = async (vendorData: any) => {
  const response = await api.post('/vendors', vendorData);
  return response.data;
};

export const updateVendor = async (id: string, vendorData: any) => {
  const response = await api.patch(`/vendors/${id}`, vendorData);
  return response.data;
};

// ==================
// USERS
// ==================

export const createOrGetUser = async (phone: string, name?: string, email?: string) => {
  const response = await api.post('/users', { phone, name, email });
  return response.data;
};

export const getUser = async (id: string) => {
  const response = await api.get(`/users/${id}`);
  return response.data;
};

export const updateUser = async (id: string, userData: any) => {
  const response = await api.patch(`/users/${id}`, userData);
  return response.data;
};

// ==================
// MOODBOARD
// ==================

export const getMoodboard = async (userId: string) => {
  const response = await api.get(`/moodboard/${userId}`);
  return response.data;
};

export const addToMoodboard = async (userId: string, vendorId: string, imageUrl: string, functionTag?: string) => {
  const response = await api.post('/moodboard', {
    user_id: userId,
    vendor_id: vendorId,
    image_url: imageUrl,
    function_tag: functionTag || 'Wedding',
  });
  return response.data;
};

export const removeFromMoodboard = async (id: string) => {
  const response = await api.delete(`/moodboard/${id}`);
  return response.data;
};

// ==================
// BOOKINGS
// ==================

export const createBooking = async (bookingData: any) => {
  const response = await api.post('/bookings', bookingData);
  return response.data;
};

export const getUserBookings = async (userId: string) => {
  const response = await api.get(`/bookings/user/${userId}`);
  return response.data;
};

export const getVendorBookings = async (vendorId: string) => {
  const response = await api.get(`/bookings/vendor/${vendorId}`);
  return response.data;
};

export const updateBooking = async (id: string, data: any) => {
  const response = await api.patch(`/bookings/${id}`, data);
  return response.data;
};

// ==================
// MESSAGES
// ==================

export const getMessages = async (userId: string, vendorId: string) => {
  const response = await api.get(`/messages/${userId}/${vendorId}`);
  return response.data;
};

export const sendMessage = async (messageData: any) => {
  const response = await api.post('/messages', messageData);
  return response.data;
};

// ==================
// GUESTS
// ==================

export const getGuests = async (userId: string) => {
  const response = await api.get(`/guests/${userId}`);
  return response.data;
};

export const addGuest = async (guestData: any) => {
  const response = await api.post('/guests', guestData);
  return response.data;
};

export const updateGuest = async (id: string, data: any) => {
  const response = await api.patch(`/guests/${id}`, data);
  return response.data;
};

// ==================
// LEADS
// ==================

export const getLeads = async (vendorId: string) => {
  const response = await api.get(`/leads/${vendorId}`);
  return response.data;
};

export const addLead = async (leadData: any) => {
  const response = await api.post('/leads', leadData);
  return response.data;
};

export const updateLead = async (id: string, data: any) => {
  const response = await api.patch(`/leads/${id}`, data);
  return response.data;
};

// ==================
// INVOICES
// ==================

export const getInvoices = async (vendorId: string) => {
  const response = await api.get(`/invoices/${vendorId}`);
  return response.data;
};

export const createInvoice = async (invoiceData: any) => {
  const response = await api.post('/invoices', invoiceData);
  return response.data;
};

// ==================
// NOTIFICATIONS
// ==================

export const getNotifications = async (userId: string) => {
  const response = await api.get(`/notifications/${userId}`);
  return response.data;
};

export const markNotificationRead = async (id: string) => {
  const response = await api.patch(`/notifications/${id}`, { read: true });
  return response.data;
};

// ==================
// BENCHMARKING
// ==================

export const getBenchmark = async (category: string, city: string) => {
  const response = await api.get(`/benchmark/${category}/${city}`);
  return response.data;
};

// ==================
// AVAILABILITY / CALENDAR
// ==================

export const getBlockedDates = async (vendorId: string) => {
  const response = await api.get(`/availability/${vendorId}`);
  return response.data;
};

export const blockDate = async (vendorId: string, date: string) => {
  const response = await api.post('/availability', { vendor_id: vendorId, blocked_date: date });
  return response.data;
};

export const unblockDate = async (id: string) => {
  const response = await api.delete(`/availability/${id}`);
  return response.data;
};
// ==================
// INVOICES — FULL
// ==================

export const saveInvoice = async (invoiceData: any) => {
  const response = await api.post('/invoices/save', invoiceData);
  return response.data;
};

export const updateInvoiceStatus = async (id: string, status: string) => {
  const response = await api.patch(`/invoices/${id}`, { status });
  return response.data;
};

// ==================
// TDS LEDGER
// ==================

export const getTDSLedger = async (vendorId: string, financial_year?: string) => {
  const params: any = {};
  if (financial_year) params.financial_year = financial_year;
  const response = await api.get(`/tds/${vendorId}`, { params });
  return response.data;
};

export const getTDSSummary = async (vendorId: string) => {
  const response = await api.get(`/tds/${vendorId}/summary`);
  return response.data;
};

export const addTDSEntry = async (entryData: any) => {
  const response = await api.post('/tds', entryData);
  return response.data;
};

// ==================
// VENDOR CLIENTS
// ==================

export const getVendorClients = async (vendorId: string) => {
  const response = await api.get(`/vendor-clients/${vendorId}`);
  return response.data;
};

export const addVendorClient = async (clientData: any) => {
  const response = await api.post('/vendor-clients', clientData);
  return response.data;
};

export const updateVendorClient = async (id: string, data: any) => {
  const response = await api.patch(`/vendor-clients/${id}`, data);
  return response.data;
};

export const deleteVendorClient = async (id: string) => {
  const response = await api.delete(`/vendor-clients/${id}`);
  return response.data;
};

// ==================
// CONTRACTS
// ==================

export const getContracts = async (vendorId: string) => {
  const response = await api.get(`/contracts/${vendorId}`);
  return response.data;
};

export const createContract = async (contractData: any) => {
  const response = await api.post('/contracts', contractData);
  return response.data;
};

export const updateContract = async (id: string, data: any) => {
  const response = await api.patch(`/contracts/${id}`, data);
  return response.data;
};

// ==================
// EXPENSES
// ==================

export const getExpenses = async (vendorId: string) => {
  const response = await api.get(`/expenses/${vendorId}`);
  return response.data;
};

export const addExpense = async (expenseData: any) => {
  const response = await api.post('/expenses', expenseData);
  return response.data;
};

export const deleteExpense = async (id: string) => {
  const response = await api.delete(`/expenses/${id}`);
  return response.data;
};

// ==================
// PAYMENT SCHEDULES
// ==================

export const getPaymentSchedules = async (vendorId: string) => {
  const response = await api.get(`/payment-schedules/${vendorId}`);
  return response.data;
};

export const createPaymentSchedule = async (data: any) => {
  const response = await api.post('/payment-schedules', data);
  return response.data;
};

export const updatePaymentSchedule = async (id: string, data: any) => {
  const response = await api.patch(`/payment-schedules/${id}`, data);
  return response.data;
};

// ==================
// TEAM MEMBERS
// ==================

export const getTeamMembers = async (vendorId: string) => {
  const response = await api.get(`/team/${vendorId}`);
  return response.data;
};

export const addTeamMember = async (data: any) => {
  const response = await api.post('/team', data);
  return response.data;
};

export const removeTeamMember = async (id: string) => {
  const response = await api.delete(`/team/${id}`);
  return response.data;
};
