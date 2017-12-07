pragma solidity ^0.4.15;

contract Booking {
	
  function Booking() {
    bookingProvider = msg.sender;
	}

  enum BookingState { Creating, Booked, Cancelled, Invalidated, Invalidating }

  struct BookingDetails {
    uint bookingId;
    uint bookingValue;
    bool isRefundable;
    BookingState bookingState;
    address customer;
    address supplier;
    uint checkInEpochSeconds;
    uint checkOutEpochSeconds;
  }
  
  address public bookingProvider; //Must be set in the constructor of the contract

  mapping(uint => BookingDetails) public bookings;

  // Many probolems with this being the public method. Customer can effectively set all the values
  // Probably needs to be two part. Create by us, pay by customer.
  function createBooking(address customer, uint bookingId, uint bookingValue, bool isRefundable, address supplier, uint checkInEpochSeconds, uint checkOutEpochSeconds) returns (bool) {
    // return false if booking Id already exists
    BookingDetails memory bookingDetails = BookingDetails(bookingId, bookingValue, isRefundable, BookingState.Creating, customer, supplier, checkInEpochSeconds, checkOutEpochSeconds);
    bookings[bookingId] = bookingDetails;
    return true;
  }

  function payForBooking(uint bookingId) payable returns (bool) { 
    BookingDetails storage bookingDetails = bookings[bookingId];
    require(bookingDetails.bookingId != 0);
    require(msg.sender == bookingDetails.customer); //do this via a modifier?
    if (msg.value != bookingDetails.bookingValue) throw;
    // TODO Do the transaction dance. 
    bookingDetails.bookingState = BookingState.Booked;
    return true;
  }

  //function cancelBooking(address customer, string bookingId) { }

  //function invalideBooking(address iniatingAddress, string bookingId) { }

  //function finalise(string bookingId) private bool { }

  function getBookingDetails(uint bookingId) constant returns (uint, uint, bool, BookingState, address, address, uint, uint) {
    // Need to ensure sender is either supplier, customer or booking provider
    //  -- Why? This is all public.
    // Maybe add a modifier?
    BookingDetails booking = bookings[bookingId];
    return (booking.bookingId, booking.bookingValue, booking.isRefundable, booking.bookingState, booking.customer, booking.supplier, booking.checkInEpochSeconds, booking.checkOutEpochSeconds);
  }

  function getBalance() constant returns (uint) {
    return this.balance;
  }

  //function getBookingState(string bookingId) constant returns (BookingState) { }
  //
  //function quoteCancellation(string bookingId) constant returns (uint) { }

}
