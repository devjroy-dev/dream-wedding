import axios from 'axios';

const API_URL = 'https://dream-wedding-production.up.railway.app/api';

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

export default api;