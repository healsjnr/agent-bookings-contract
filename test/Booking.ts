import { BookingInstance } from "../contracts";

import * as chai from 'chai';
import * as dirtyChai from 'dirty-chai';
import ChaiBigNumber = require('chai-bignumber');
import chaiAsPromised = require('chai-as-promised');

export const chaiSetup = {
    configure() {
        chai.config.includeStack = true;
        chai.use(ChaiBigNumber());
        chai.use(dirtyChai);
        chai.use(chaiAsPromised);
    },
};

const expect = chai.expect;

const Booking = artifacts.require("Booking");

contract("Booking", function([_, customer, supplier]) {

  let booking: BookingInstance;

  const bookingId = 1234;
  const bookingValue = 256;
  const isRefundable = false;
  const today = new Date();
  const tomorrow = new Date(today.getTime() + 1000 * 60 * 60 * 24);
  const checkInEpochSeconds = Math.round(today.getTime() / 1000);
  const checkOutEpochSeconds = Math.round(tomorrow.getTime() / 1000);

  before(async() => {
    booking = await Booking.new();
    await booking.createBooking(customer, bookingId, bookingValue, isRefundable, supplier, checkInEpochSeconds, checkOutEpochSeconds);
  });

  it("creates a booking", async () => {
    const bookingResult = await booking.getBookingDetails.call(bookingId);
    console.log("booking: " + JSON.stringify(bookingResult));
  });

  describe('pay for a booking', () => {
    it("allows the customer to pay for the booking", async() => {
      await booking.payForBooking(bookingId ,{from: customer});
      // How to nicely pull out the values into an obejct?
      // How to nicely deal with enums?
      const bookingResult = await booking.getBookingDetails.call(bookingId);
      console.log("booking: " + JSON.stringify(bookingResult));
      console.log(bookingResult[3]);
      expect(bookingResult[3]).to.equal("1");
    });

    it('decreases the customers account balance')

    it('increases the contracts account balance')

    it('fails when the customer does not have enough money')

    it('fails when the customer is not the sender', async() => {
      try {
        await booking.payForBooking(bookingId ,{from: supplier});
        assert.fail('Expected invalid opcode')
      } catch(error) {
        expect(error.message).to.have.string('invalid opcode');
      }
    });



  });


});
