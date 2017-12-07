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
    // TODO 
    // Remove data and just have a finalised_at date
    // add balances for customer, supplier, agent
    // This is kind of like a token. All three parties can call balanceOf(_tokenId) and recieve their balance
    // The customer balance goes to 0 once the finalised at has been reached
    // The others go to zero on draw down
  }
  
  address public bookingProvider; //Must be set in the constructor of the contract

  mapping(uint => BookingDetails) public bookings;

  // Many probolems with this being the public method. Customer can effectively set all the values
  // Probably needs to be two part. Create by us, pay by customer.
  function createBooking(address customer, uint bookingId, uint bookingValue, bool isRefundable, address supplier, uint checkInEpochSeconds, uint checkOutEpochSeconds) returns (bool) {
    require(bookings[bookingId].bookingId == 0);
    BookingDetails memory bookingDetails = BookingDetails(bookingId, bookingValue, isRefundable, BookingState.Creating, customer, supplier, checkInEpochSeconds, checkOutEpochSeconds);
    bookings[bookingId] = bookingDetails;
    return true;
  }

  function payForBooking(uint bookingId) payable returns (bool) { 
    BookingDetails storage bookingDetails = bookings[bookingId];
    require(bookingDetails.bookingId != 0);
    require(bookingDetails.bookingState == BookingState.Creating);
    require(msg.sender == bookingDetails.customer);
    require(msg.value == bookingDetails.bookingValue);
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

  //function balanceOf(_tokenId)
  //function getBookingState(string bookingId) constant returns (BookingState) { }
  //
  //function quoteCancellation(string bookingId) constant returns (uint) { }

}
