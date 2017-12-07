import { BookingInstance } from "../contracts";

import * as chai from 'chai';
import * as dirtyChai from 'dirty-chai';

import ChaiBigNumber = require('chai-bignumber');
import chaiAsPromised = require('chai-as-promised');

export const chaiSetup = {
    configure() {
        chai.config.includeStack = true;
        chai.use(ChaiBigNumber(web3.BigNumber));
        chai.use(dirtyChai);
        chai.use(chaiAsPromised);
    },
};
chaiSetup.configure();

const expect = chai.expect;

const Booking = artifacts.require("Booking");

contract("Booking", function([_, customer, supplier]) {

  let booking: BookingInstance;

  const bookingId = new web3.BigNumber(1234);
  const bookingValue = new web3.BigNumber(256);
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
    expect(bookingResult[0]).to.be.bignumber.equal(bookingId);
    expect(bookingResult[1]).to.be.bignumber.equal(bookingValue);
    expect(bookingResult[2]).to.equal(isRefundable);
    expect(bookingResult[3]).to.be.bignumber.equal(0);
    expect(bookingResult[4]).to.equal(customer);
    expect(bookingResult[5]).to.equal(supplier);
    expect(bookingResult[6]).to.be.bignumber.equal(checkInEpochSeconds);
    expect(bookingResult[7]).to.be.bignumber.equal(checkOutEpochSeconds);
  });

  describe('pay for a booking', () => {
    it("allows the customer to pay for the booking", async () => {
      await booking.payForBooking(bookingId ,{from: customer, value: bookingValue});
      const bookingResult = await booking.getBookingDetails.call(bookingId);
      expect(bookingResult[3]).to.be.bignumber.equal(1);
    });

    it('decreases the customer account correctly', async () => {
      const customerAmountBeforePayment = web3.eth.getBalance(customer);
      const result: any = await booking.payForBooking(bookingId ,{from: customer, value: bookingValue});
      const gasPrice = web3.eth.getTransaction(result.tx).gasPrice.toNumber();
      const gasUsed = result.receipt.gasUsed;
      const gas = gasUsed * gasPrice;
      const customerAmountAfterPayment = web3.eth.getBalance(customer);
      const customerDifference = customerAmountBeforePayment.minus(customerAmountAfterPayment);
      const customerDifferenceLessGas = customerDifference.minus(gas);
      expect(customerDifferenceLessGas).to.be.bignumber.equal(bookingValue);
    });

    it('increase the contract value correctly', async () => {
      const initialBalance = web3.eth.getBalance(booking.address);
      await booking.payForBooking(bookingId ,{from: customer, value: bookingValue});
      const finalBalance = web3.eth.getBalance(booking.address);
      expect(finalBalance.minus(initialBalance)).to.be.bignumber.equal(bookingValue);
    })

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
