const API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL;

const Endpoints = {
  //AUTH
  LOGIN: `${API_URL}/userAuth/login`,
  LOGOUT: `${API_URL}/userAuth/logout`,

  //PASSWORD AND VERIFY EMAIL
  FORGOT_PASSWORD: `${API_URL}/userAuth/forgot-password`,
  VERIFY_OTP: `${API_URL}/userAuth/verify-otp`,
  SET_FORGOT_PASSWORD: `${API_URL}/userAuth/set-forgot-password`,
  RESET_PASSWORD: `${API_URL}/userAuth/reset-password`,
  SEND_EMAIL_VERIFICATION_MAIL: `${API_URL}/userAuth/sendEmailVerificationMail`,
  VERIFY_EMAIL: `${API_URL}/userAuth/verify-email`,
  REGISTER_FCM_TOKEN: `${API_URL}/userAuth/registerFcmToken`,

  //GUEST
  CREATE_GUEST: `${API_URL}/guest/create`,

  //USER
  CREATE_USER: `${API_URL}/user/create`,
  GET_USER: `${API_URL}/user/get/:id`,
  UPDATE_USER: `${API_URL}/user/update/:id`,
  DELETE_USER: `${API_URL}/user/delete/:ids`,
  GET_ALL_USERS: `${API_URL}/user/getAll`,

  //COMMON
  TEMP_FILE_UPLOAD: `${API_URL}/common/tempFileUpload`,

  //CUSTOMER
  CREATE_CUSTOMER: `${API_URL}/customer/create`,
  GET_CUSTOMER_BY_ID: `${API_URL}/customer/get/:id`,
  UPDATE_CUSTOMER: `${API_URL}/customer/update/:id`,
  DELETE_CUSTOMER: `${API_URL}/customer/delete/:ids`,
  GET_ALL_CUSTOMERS: `${API_URL}/customer/getAll`,
  ADD_TO_FAVORITES: `${API_URL}/customer/addToFavorites/:id`,

  //HOTEL
  CREATE_HOTEL: `${API_URL}/hotel/create`,
  GET_HOTEL: `${API_URL}/hotel/get/:id`,
  UPDATE_HOTEL: `${API_URL}/hotel/update/:id`,
  DELETE_HOTEL: `${API_URL}/hotel/delete/:ids`,
  GET_ALL_HOTELS: `${API_URL}/hotel/getAll`,

  //HOTEL_AMENITIES
  CREATE_HOTEL_AMENITY: `${API_URL}/hotelAmenities/create`,
  GET_HOTEL_AMENITY: `${API_URL}/hotelAmenities/get/:id`,
  UPDATE_HOTEL_AMENITY: `${API_URL}/hotelAmenities/update/:id`,
  DELETE_HOTEL_AMENITY: `${API_URL}/hotelAmenities/delete/:ids`,
  GET_ALL_HOTEL_AMENITIES: `${API_URL}/hotelAmenities/getAll`,

  //MASTER_ROOM
  CREATE_MASTER_ROOM: `${API_URL}/masterRoom/create`,
  GET_MASTER_ROOM: `${API_URL}/masterRoom/get/:id`,
  UPDATE_MASTER_ROOM: `${API_URL}/masterRoom/update/:id`,
  DELETE_MASTER_ROOM: `${API_URL}/masterRoom/delete/:ids`,
  GET_ALL_MASTER_ROOMS: `${API_URL}/masterRoom/getAll`,

  //SUB_ROOM
  CREATE_SUB_ROOM: `${API_URL}/subRoom/create`,
  GET_SUB_ROOM: `${API_URL}/subRoom/get/:id`,
  UPDATE_SUB_ROOM: `${API_URL}/subRoom/update/:id`,
  DELETE_SUB_ROOM: `${API_URL}/subRoom/delete/:ids`,
  GET_ALL_SUB_ROOMS: `${API_URL}/subRoom/getAll`,

  //BOOKING
  CREATE_BOOKING: `${API_URL}/booking/create`,
  GET_BOOKING_BY_ID: `${API_URL}/booking/get/:id`,
  UPDATE_BOOKING: `${API_URL}/booking/update/:id`,
  DELETE_BOOKING: `${API_URL}/booking/delete/:ids`,
  GET_ALL_BOOKINGS: `${API_URL}/booking/getAll`,
  REQUEST_BOOKING_CANCELLATION: `${API_URL}/booking/requestBookingCancellation/:bookingId`,
  RESPOND_TO_CANCELLATION_REQUEST: `${API_URL}/booking/respondToCancellationRequest/:bookingId`,

  //SLOT
  CREATE_SLOT: `${API_URL}/slot/create`,
  GET_SLOT_BY_ID: `${API_URL}/slot/get/:id`,
  UPDATE_SLOT: `${API_URL}/slot/update/:id`,
  DELETE_SLOT: `${API_URL}/slot/delete/:ids`,
  GET_ALL_SLOTS: `${API_URL}/slot/getAll`,

  //REVIEW
  CREATE_REVIEW: `${API_URL}/review/create`,
  GET_REVIEW_BY_ID: `${API_URL}/review/get/:id`,
  UPDATE_REVIEW: `${API_URL}/review/update/:id`,
  DELETE_REVIEW: `${API_URL}/review/delete/:ids`,
  GET_ALL_REVIEWS: `${API_URL}/review/getAll`,

  //NOTIFICATION
  DELETE_NOTIFICATION: `${API_URL}/notification/delete/:ids`,
  GET_ALL_NOTIFICATIONS: `${API_URL}/notification/getAll`,

  //SUPPORT
  CREATE_SUPPORT_TICKET: `${API_URL}/support/create`,
  GET_SUPPORT_TICKET_BY_ID: `${API_URL}/support/get/:id`,
  UPDATE_SUPPORT_TICKET: `${API_URL}/support/update/:id`,
  DELETE_SUPPORT_TICKET: `${API_URL}/support/delete/:ids`,
  GET_ALL_SUPPORT_TICKETS: `${API_URL}/support/getAll`,
  ASSIGN_SUPPORT_TICKET: `${API_URL}/support/assignTicket/:supportId/:userId`,
  AUTO_ASSIGN_SUPPORT_TICKET: `${API_URL}/support/autoAssign/:supportId`,
  UPDATE_SUPPORT_TICKET_STATUS: `${API_URL}/support/statusUpdate/:supportId`,

  //PAYMENT
  RECIEVE_PAYMENT: `${API_URL}/payment/recive`,
  WEBHOOK: `${API_URL}/payment/webhook`,
};

export default Endpoints;
