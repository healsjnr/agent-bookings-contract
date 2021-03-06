pragma solidity ^0.4.15;

contract Booking {

  function Booking() public {
    bookingProvider = msg.sender;
	}

  enum BookingState { Creating, Booked, Cancelled, Invalidated, Invalidating, Finalised }

  struct BookingDetails {
    uint bookingId;
    uint bookingValue;
    uint commissionValue;
    BookingState bookingState;
    address customer;
    address supplier;
    uint finalisedAtEpochSeconds;
    mapping(address => uint) balances;
  }
  
  address public bookingProvider;
  mapping(uint => BookingDetails) public bookings;
  mapping(uint => mapping (address => uint)) public balances;

  function createBooking(uint bookingId, uint bookingValue, uint commissionValue, address customer, address supplier, uint finalisedAtEpochSeconds) 
    public 
    returns (bool) 
  {
    require(bookings[bookingId].bookingId == 0);
    require(commissionValue < bookingValue);
    BookingDetails memory bookingDetails = BookingDetails(
      bookingId, 
      bookingValue, 
      commissionValue, 
      BookingState.Creating, 
      customer, 
      supplier, 
      finalisedAtEpochSeconds);
    bookings[bookingId] = bookingDetails;
    balances[bookingId][bookingProvider] = 0; 
    balances[bookingId][customer] = 0; 
    balances[bookingId][supplier] = 0; 
    return true;
  }

  function payForBooking(uint bookingId) 
    payable 
    public 
    returns (bool) 
  { 
    BookingDetails storage bookingDetails = bookings[bookingId];
    require(bookingDetails.bookingId != 0);
    require(bookingDetails.bookingState == BookingState.Creating);
    require(msg.sender == bookingDetails.customer);
    require(msg.value == bookingDetails.bookingValue);
    bookingDetails.bookingState = BookingState.Booked;
    balances[bookingId][bookingDetails.customer] = bookingDetails.bookingValue;
    balances[bookingId][bookingDetails.supplier] = bookingDetails.bookingValue - bookingDetails.commissionValue;
    balances[bookingId][bookingProvider] = bookingDetails.commissionValue;
    return true;
  }

  //function cancelBooking(uint bookingId) public returns (bool) { }

  //function invalideBooking(uint bookingId) public returns (bool) { }

  function drawDown(uint bookingId) public returns (bool) {
    BookingDetails storage bookingDetails = bookings[bookingId];
    require(bookingDetails.bookingId != 0);
    require(bookingDetails.bookingState == BookingState.Booked);
    require(msg.sender == bookingProvider || msg.sender == bookingDetails.supplier);
    require(bookingDetails.finalisedAtEpochSeconds <= block.timestamp);
    uint netAmount = bookingDetails.bookingValue - bookingDetails.commissionValue;
    bookingDetails.supplier.transfer(netAmount);
    bookingProvider.transfer(bookingDetails.commissionValue);
    balances[bookingId][bookingProvider] = 0; 
    balances[bookingId][bookingDetails.supplier] = 0; 
    balances[bookingId][bookingDetails.customer] = 0; 
  }

  function getBalance() 
    public 
    constant 
    returns (uint)
  {
    return this.balance;
  }
  
  function balanceOf(uint bookingId)
    public 
    constant
    returns (uint)
  {
    BookingDetails memory booking = bookings[bookingId];
    require(booking.bookingId != 0);
    require(msg.sender == booking.customer || msg.sender == booking.supplier || msg.sender == bookingProvider);

    if (msg.sender == booking.customer) {
      if (booking.finalisedAtEpochSeconds < block.timestamp)
        return 0;
    } else {
      if (booking.finalisedAtEpochSeconds > block.timestamp)
        return 0;
    }
    return balances[bookingId][msg.sender];
  }

  function getBookingDetails(uint bookingId) 
    public
    constant 
    returns (uint, uint, uint, BookingState, address, address, uint) 
  {
    BookingDetails memory booking = bookings[bookingId];
    return (booking.bookingId, 
      booking.bookingValue, 
      booking.commissionValue, 
      booking.bookingState, 
      booking.customer, 
      booking.supplier, 
      booking.finalisedAtEpochSeconds);
  }


}
