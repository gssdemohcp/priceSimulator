sap.ui.define([
	"sap/ui/Device",
	"com/sd/price/sim/util/Controller",
	"com/sd/price/sim/dev/devapp",
	"sap/ui/model/json/JSONModel"
], function(Device, Controller, devapp, JSONModel) {
	"use strict";
	return Controller.extend("com.sd.price.sim.controller.Simulation", {
		/**
		 * Called when the master list controller is instantiated. 
		 * It sets up the event handling for the master/detail communication and other lifecycle tasks.
		 * 
		 */
		onInit: function() {
			// On Route Matched, when ever the material is pressed, to load all the price details
			this.getRouter().getRoute("Simulation").attachMatched(this._onRouteMatched, this);

			// Get the Config Model from Configuration Service
			// Instantiate the Local Storage for storing the speed & increment/decrement values
			jQuery.sap.require("jquery.sap.storage");
			var oStore = jQuery.sap.storage(jQuery.sap.storage.Type.local);
			var oSimConfig = oStore.get("simUserConfig");
			// If the Simulator User Configuraiton is Locally Saved then fine or read it from config
			if (!oSimConfig) {
				oSimConfig = this._getOriginalSimConfigModel();
			}
			var oSimConfModel = new JSONModel(oSimConfig);
			this.getView().setModel(oSimConfModel, "simConfig");

			// Set globally the increment & Decrement Sppeds
			this._incSpeed = oSimConfig.IncSpeed;
			this._decSpeed = oSimConfig.DecSpeed;

			////////////////////////////////////////////////////////////////////////////////////////
			// Register for button press
			////////////////////////////////////////////////////////////////////////////////////////

			// FOB Buttons Press
			this._attachBrowserEvent("dFobButn", "mousedown", this._handleMouseDownFOBSub, this);
			this._attachBrowserEvent("dFobButn", "mouseup", this._handleMouseUpFOBSub, this);
			this._attachBrowserEvent("uFobButn", "mousedown", this._handleMouseDownFOBAdd, this);
			this._attachBrowserEvent("uFobButn", "mouseup", this._handleMouseUpFOBAdd, this);

			// Sales Price Buttons Press
			this._attachBrowserEvent("dSpButn", "mousedown", this._handleMouseDownSpSub, this);
			this._attachBrowserEvent("dSpButn", "mouseup", this._handleMouseUpSpSub, this);
			this._attachBrowserEvent("uSpButn", "mousedown", this._handleMouseDownSpAdd, this);
			this._attachBrowserEvent("uSpButn", "mouseup", this._handleMouseUpSpAdd, this);

			// Customer GP Buttons Press
			this._attachBrowserEvent("dCGPButn", "mousedown", this._handleMouseDownCGPSub, this);
			this._attachBrowserEvent("dCGPButn", "mouseup", this._handleMouseUpCGPSub, this);
			this._attachBrowserEvent("uCGPButn", "mousedown", this._handleMouseDownCGPAdd, this);
			this._attachBrowserEvent("uCGPButn", "mouseup", this._handleMouseUpCGPAdd, this);
		},

		/**
		 * Initialize few global variables
		 */
		_incSpeed: "",
		_decSpeed: "",
		_interval: "",
		_alreadySetMouse: false,

		/**
		 * Gets the Current Simulation Configuration
		 * @return{json object} returns the json object of the simulation configuration(currently being changed)
		 */
		_getCurrentSimConfigData: function() {
			return this.getView().getModel("simConfig").getData();
		},

		/**
		 * Gets the Original Simulation Configuration
		 * @return{json object} returns the Original unchanged simulation configuration in json format
		 */
		_getOriginalSimConfigModel: function() {
			// Set the Simulation Config Model
			return {
				"FOBInc": this._fetchConfigValue("FOBINC", this),
				"FOBDec": this._fetchConfigValue("FOBDEC", this),
				"SPInc": this._fetchConfigValue("SPINC", this),
				"SPDec": this._fetchConfigValue("SPDEC", this),
				"CGInc": this._fetchConfigValue("CGINC", this),
				"CGDec": this._fetchConfigValue("CGDEC", this),
				"IncSpeed": this._fetchConfigValue("INCSPEED", this),
				"DecSpeed": this._fetchConfigValue("DECSPEED", this)
			};
		},

		/**
		 * attaches the browser even touch start/end & mouse down/up
		 * based on the device type being used
		 */
		_attachBrowserEvent: function(sID, sEventName, sMethodName, that) {
			if (Device.support.touch) {
				if (sEventName === "mousedown") {
					var sEvtNam = "touchstart";
				} else {
					sEvtNam = "touchend";
					var sEventOut = "touchmove";
				}
				this.getView().byId(sID).attachBrowserEvent(sEvtNam, sMethodName, that);
			} else {
				this.getView().byId(sID).attachBrowserEvent(sEventName, sMethodName, that);
				sEventOut = "mouseout";
			}
			if (!sEvtNam) {
				sEvtNam = sEventName;
			}

			if (sEvtNam === "touchend" || sEvtNam === "mouseup") {
				this.getView().byId(sID).attachBrowserEvent(sEventOut, sMethodName, that);
			}
		},

		/**
		 * Used when the touch on the button is released, stops the auto increment of the values
		 */
		_handleMouseUp: function(sInterval, sAlreadySet) {
			// if (sInterval) {
			// 	clearInterval(sInterval);
			// 	sInterval = "";
			// 	sAlreadySet = false;
			// }
		},

		/////////////////////////////////////////////////////////////////////////////////////////////
		<!-- Handle FOB Press -->
		/////////////////////////////////////////////////////////////////////////////////////////////
		// Subtraction

		/**
		 * When the FOB Decrement button is clicked or touched, auto decrements the value of FOB input
		 */
		_handleMouseDownFOBSub: function() {
			// Subtract Data
			navigator.vibrate(20);
			this._intervalFOBSub = setInterval(function() {
				this._alreadySetMouseFOBSub = true;
				this._FobCalSub(this);
			}.bind(this), this._decSpeed);
			return false;
		},

		_handleMouseUpFOBSub: function() {
			if (this._intervalFOBSub) {
				clearInterval(this._intervalFOBSub);
				this._intervalFOBSub = "";
				this._alreadySetMouseFOBSub = false;
			}
		},
		/**
		 * Subtracts the FOB cost by some config value
		 */
		onFobPressDown: function() {
			if (!this._alreadySetMouseFOBSub) {
				navigator.vibrate(20);
				this._FobCalSub(this);
			}
		},

		/**
		 * Subtracts the FOB cost by some config value and triggers the standard price
		 * recalculation & Margin recalculation
		 */
		_FobCalSub: function(that) {
			var FobDec = this._getCurrentSimConfigData().FOBDec;

			var oSimData = that.getView().getModel("simData").getData();
			oSimData.Fob = parseFloat(oSimData.Fob) - parseFloat(FobDec);
			that.getView().getModel("simData").setData(oSimData);
			that._calculateStandardPrice(that);
			that._calculateMargin(that);
		},

		// Addition

		/**
		 * When the FOB Increment button is clicked or touched, auto increments the value of FOB input
		 */
		_handleMouseDownFOBAdd: function() {
			// Subtract Data
			navigator.vibrate(20);
			this._intervalFOBAdd = setInterval(function() {
				this._alreadySetMouseFOBAdd = true;
				this._FobCalAdd(this);
			}.bind(this), this._incSpeed);
		},

		_handleMouseUpFOBAdd: function() {
			if (this._intervalFOBAdd) {
				clearInterval(this._intervalFOBAdd);
				this._intervalFOBAdd = "";
				this._alreadySetMouseFOBAdd = false;
			}
		},

		/**
		 * Increases the FOB cost by some config value
		 */
		onFobPressUp: function() {
			if (!this._alreadySetMouseFOBAdd) {
				navigator.vibrate(20);
				this._FobCalAdd(this);
			}
		},

		/**
		 * Adds the FOB cost by some config value and triggers the standard price
		 * recalculation & Margin recalculation
		 */
		_FobCalAdd: function(that) {
			var FobInc = this._getCurrentSimConfigData().FOBInc;

			var oSimData = that.getView().getModel("simData").getData();
			oSimData.Fob = parseFloat(oSimData.Fob) + parseFloat(FobInc);
			that.getView().getModel("simData").setData(oSimData);
			that._calculateStandardPrice(that);
			that._calculateMargin(that);
		},

		/////////////////////////////////////////////////////////////////////////////////////////////
		<!-- Standard Price Calculation -->
		/////////////////////////////////////////////////////////////////////////////////////////////

		/**
		 * Calculates the standard price & Marigin recalculation on entering some value in the input
		 * and when enter is pressed
		 */
		onFobSubmit: function() {
			this._calculateStandardPrice(this);
			this._calculateMargin(this);
		},

		/**
		 * Calculates the standard cost based the incremented FOB value and other calculated costs
		 */
		_calculateStandardPrice: function(that) {
			var oSimData = that.getView().getModel("simData").getData();

			// If it is percentage based then recalculate all the costs
			if (that._fetchConfigValue("PERCENT_BASED", that)) {
				that._updatePercentageCost("FREIGHT_%", that, oSimData, "Freight");
				that._updatePercentageCost("OVERHEAD_%", that, oSimData, "Overhead");
				that._updatePercentageCost("CUSTOMFEE_%", that, oSimData, "CustomFees");
				that._updatePercentageCost("CUSTOMDUTY_%", that, oSimData, "CustomDuty");
			}

			oSimData.StandardCost = parseFloat(oSimData.Freight) + parseFloat(oSimData.Overhead) + parseFloat(oSimData.CustomFees) +
				parseFloat(oSimData.CustomDuty) + parseFloat(oSimData.Others) + parseFloat(oSimData.Fob);

			that.getView().getModel("simData").setData(oSimData);
		},

		/**
		 * Updates the all other costs based on the FOB Cost & Provided percentage
		 */
		_updatePercentageCost: function(sKey, that, oSimData, sName) {
			var sPercentage = that._fetchConfigValue(sKey, that);
			if (sPercentage && oSimData[sName]) {
				oSimData[sName] = (parseFloat(oSimData.Fob) * parseFloat(sPercentage)) / 100;
			}
		},

		/////////////////////////////////////////////////////////////////////////////////////////////
		<!-- Handle Sp(Sales Price) Press -->
		/////////////////////////////////////////////////////////////////////////////////////////////

		// Subtraction

		/**
		 * When the Sales Price Decrement button is clicked or touched, auto decrements the value of 
		 * Sales Price input
		 */
		_handleMouseDownSpSub: function() {
			// Subtract Data
			navigator.vibrate(20);
			this._intervalSpSub = setInterval(function() {
				this._alreadySetMouseSpSub = true;
				this._SpCalSub(this);
			}.bind(this), this._decSpeed);
		},

		_handleMouseUpSpSub: function() {
			if (this._intervalSpSub) {
				clearInterval(this._intervalSpSub);
				this._intervalSpSub = "";
				this._alreadySetMouseSpSub = false;
			}
		},

		/**
		 * Subtracts the Sales Price  by some config value
		 */
		onSpPressDown: function() {
			if (!this._alreadySetMouseSpSub) {
				navigator.vibrate(20);
				this._SpCalSub(this);
			}
		},

		/**
		 * Subtracts the Sales Price by some config value and triggers the Margin & 
		 * Shelf price recalculation
		 */
		_SpCalSub: function(that) {
			var SPDec = this._getCurrentSimConfigData().SPDec;

			var oSimData = that.getView().getModel("simData").getData();
			oSimData.Kbetr = parseFloat(oSimData.Kbetr) - parseFloat(SPDec);

			this._calculateSalesPriceConversion(oSimData);

			that.getView().getModel("simData").setData(oSimData);
			that._calculateMargin(that);
			// Change in the Sales price will not only affect the 
			this._calculateShelfPrice(that);
		},

		// Addition

		/**
		 * When the Sales Price Increment button is clicked or touched, auto increments the value 
		 * of Sales Price input
		 */
		_handleMouseDownSpAdd: function() {
			// Subtract Data
			navigator.vibrate(20);
			this._intervalSpAdd = setInterval(function() {
				this._alreadySetMouseSpAdd = true;
				this._SpCalAdd(this);
			}.bind(this), this._incSpeed);
		},

		_handleMouseUpSpAdd: function() {
			if (this._intervalSpAdd) {
				clearInterval(this._intervalSpAdd);
				this._intervalSpAdd = "";
				this._alreadySetMouseSpAdd = false;
			}
		},

		/**
		 * Increases the Sales Prie by some config value
		 */
		onSpPressUp: function() {
			if (!this._alreadySetMouseSpAdd) {
				navigator.vibrate(20);
				this._SpCalAdd(this);
			}
		},

		/**
		 * Adds the Sales Price by some config value and triggers the Margin
		 * Shelf price recalculation
		 */
		_SpCalAdd: function(that) {
			var SPInc = this._getCurrentSimConfigData().SPInc;

			var oSimData = that.getView().getModel("simData").getData();
			oSimData.Kbetr = parseFloat(oSimData.Kbetr) + parseFloat(SPInc);

			this._calculateSalesPriceConversion(oSimData);

			that.getView().getModel("simData").setData(oSimData);
			that._calculateMargin(that);
			// Change in the Sales price will not only affect the 
			this._calculateShelfPrice(that);
		},

		/**
		 * Calcualtes the Sales price in alternate currency
		 */
		_calculateSalesPriceConversion: function(oSimData) {
			if (oSimData.Inv) {
				oSimData.salesPriceConv = parseFloat(oSimData.Kbetr) / parseFloat(oSimData.ExchRate);
			} else {
				oSimData.salesPriceConv = parseFloat(oSimData.Kbetr) * parseFloat(oSimData.ExchRate);
			}
		},

		/////////////////////////////////////////////////////////////////////////////////////////////
		<!-- Margin Calculation -->
		/////////////////////////////////////////////////////////////////////////////////////////////

		/**
		 * When the input is entered in the sales price, shelf price and Margin values are recalculated
		 */
		onSpSubmit: function() {
			this._calculateMargin(this);
			// Change in the Sales price will not only affect the 
			this._calculateShelfPrice(this);
			// Update the converted Sales Price also
			var oSimData = this.getView().getModel("simData").getData();
			this._calculateSalesPriceConversion(oSimData);
			this.getView().getModel("simData").setData(oSimData);
		},

		/**
		 * Calculates the Margin based on Standard cost & Sales price
		 */
		_calculateMargin: function(that) {
			var oSimData = that.getView().getModel("simData").getData();
			oSimData.margin = ((parseFloat(oSimData.Kbetr) - parseFloat(oSimData.StandardCost)) * 100) / parseFloat(oSimData.StandardCost);
			oSimData.margin = oSimData.margin.toFixed(2);
			that.getView().getModel("simData").setData(oSimData);
		},

		/////////////////////////////////////////////////////////////////////////////////////////////
		<!-- Handle CGP(Customer GP) Press -->
		/////////////////////////////////////////////////////////////////////////////////////////////
		// Subtraction

		/**
		 * When the Cost GP Decrement button is clicked or touched, auto decrements the value of 
		 * Cost GP input
		 */
		_handleMouseDownCGPSub: function() {
			// Subtract Data
			navigator.vibrate(20);
			this._intervalCGPSub = setInterval(function() {
				this._alreadySetMouseCGPSub = true;
				this._CGPCalSub(this);
			}.bind(this), this._decSpeed);
		},

		_handleMouseUpCGPSub: function() {
			if (this._intervalCGPSub) {
				clearInterval(this._intervalCGPSub);
				this._intervalCGPSub = "";
				this._alreadySetMouseCGPSub = false;
			}
		},

		/**
		 * Subtracts the Cost GP  by some config value
		 */
		onCGPPressDown: function() {
			if (!this._alreadySetMouseCGPSub) {
				navigator.vibrate(20);
				this._CGPCalSub(this);
			}
		},

		/**
		 * Subtracts the Cost GP by some config value and triggers the 
		 * Shelf price recalculation
		 */
		_CGPCalSub: function(that) {
			var CGDec = this._getCurrentSimConfigData().CGDec;

			var oSimData = that.getView().getModel("simData").getData();
			oSimData.custGP = parseFloat(oSimData.custGP) - parseFloat(CGDec);
			that.getView().getModel("simData").setData(oSimData);
			// Calculate the Self price when the Cust GP is updated
			this._calculateShelfPrice(that);
		},

		// Addition

		/**
		 * When the Cost GP Increment button is clicked or touched, auto increments the value 
		 * of Cost GP input
		 */
		_handleMouseDownCGPAdd: function() {
			// Subtract Data
			navigator.vibrate(20);
			this._intervalCGPAdd = setInterval(function() {
				this._alreadySetMouseCGPAdd = true;
				this._CGPCalAdd(this);
			}.bind(this), this._incSpeed);
		},

		_handleMouseUpCGPAdd: function() {
			if (this._intervalCGPAdd) {
				clearInterval(this._intervalCGPAdd);
				this._intervalCGPAdd = "";
				this._alreadySetMouseCGPAdd = false;
			}
		},

		/**
		 * Increases the Cost GP by some config value
		 */
		onCGPPressUp: function() {
			if (!this._alreadySetMouseCGPAdd) {
				navigator.vibrate(20);
				this._CGPCalAdd(this);
			}
		},

		/**
		 * Adds the Cost GP by some config value and triggers the
		 * Shelf price recalculation
		 */
		_CGPCalAdd: function(that) {
			var CGInc = this._getCurrentSimConfigData().CGInc;

			var oSimData = that.getView().getModel("simData").getData();
			oSimData.custGP = parseFloat(oSimData.custGP) + parseFloat(CGInc);
			that.getView().getModel("simData").setData(oSimData);
			// Calculate the Self price when the Cust GP is updated
			this._calculateShelfPrice(that);
		},

		/////////////////////////////////////////////////////////////////////////////////////////////
		<!-- Shelf Price Calculation -->
		/////////////////////////////////////////////////////////////////////////////////////////////

		/**
		 * Calculates the shelf price recalculation when the data is enterd in the cust gp input 
		 * manually
		 */
		onCustGPSumbit: function() {
			this._calculateShelfPrice(this);
		},

		/**
		 * Calcualtes the Shelf price based on the cust gp & sales price
		 */
		_calculateShelfPrice: function(that) {
			var oSimData = that.getView().getModel("simData").getData();
			oSimData.shelfPrice = parseFloat(oSimData.Kbetr) / (1 - parseFloat(oSimData.custGP) / 100);
			oSimData.shelfPrice = oSimData.shelfPrice.toFixed(2);
			that.getView().getModel("simData").setData(oSimData);
		},

		/**
		 * Resets Current Simulation data to Original Simulation
		 */
		handleReset: function() {
			this._setSimulationModel();
		},

		/**
		 * Sends the mail
		 */
		handleSendMail: function() {
			var sSubject,
				sBody;
			var oData = this.getView().getModel("simData").getData();
			sSubject = "Simulated Price for " + "Customer: " + oData.Name1 + " - " + oData.Pkunag;
			// Costs
			sBody = "Standard Cost : " + parseFloat(oData.StandardCost).toFixed(2) + "\n";
			sBody = sBody + "Cost/Price Unit : " + oData.Losgr + oData.Meins + "\n" + "\n";

			sBody = sBody + "FOB : " + parseFloat(oData.Fob).toFixed(2) + "\n";
			sBody = sBody + "Freight : " + parseFloat(oData.Freight).toFixed(2) + "\n";
			sBody = sBody + "Overhead : " + parseFloat(oData.Overhead).toFixed(2) + "\n";
			sBody = sBody + "Customs Duty : " + parseFloat(oData.CustomDuty).toFixed(2) + "\n";
			sBody = sBody + "Duty Rate : " + parseFloat(oData.DutyRate).toFixed(2) + "\n" + "\n";
			// Sales Price & Calculated fields
			sBody = sBody + "Sales Price : " + parseFloat(oData.Kbetr).toFixed(2) + "\n";
			sBody = sBody + "Cust GP : " + parseFloat(oData.custGP).toFixed(2) + "%" + "\n";
			sBody = sBody + "Shelf Price : " + parseFloat(oData.shelfPrice).toFixed(2) + "\n";
			sBody = sBody + "Margin : " + parseFloat(oData.margin).toFixed(2) + "%" + "\n";

			sap.m.URLHelper.triggerEmail(null, sSubject, sBody);
		},

		/**
		 * Returns to the detail view
		 */
		onNavBack: function() {
			this.getRouter().myNavBack("detail");
		},

		/**
		 * On Route Matched, current simulation model will be set
		 */
		_onRouteMatched: function() {
			this._setSimulationModel();
		},

		/**
		 * Sets the simulation model based on the customer & material cost data
		 */
		_setSimulationModel: function() {
			var oModel = this.getView().getModel("simulationModel"),
				origData = oModel.getData(),
				simData = {
					"margin": 0,
					"custGP": 0,
					"shelfPrice": "",
					"salesPriceConv": 0
				};
			var oCopyData = jQuery.extend(true, {}, origData);
			simData = jQuery.extend(oCopyData, simData);

			this._calculateSalesPriceConversion(simData);

			var oSimModel = new JSONModel(simData);
			this.getView().setModel(oSimModel, "simData");
			// Initially calcualte all with the original values
			this._calculateMargin(this);
			this._calculateShelfPrice(this);
		},

		/**
		 * Sets the dialogs configuation
		 */
		_dialog: {
			"simulationConfig": null
		},

		/**
		 * Opens the Dialog 
		 */
		_openDialog: function(sFragmentName) {
			if (!this._dialog[sFragmentName]) {
				this._dialog[sFragmentName] = sap.ui.xmlfragment("com.sd.price.sim.view." + sFragmentName, this);
				this._dialog[sFragmentName].addStyleClass(this.getOwnerComponent().getContentDensityClass());
				this.getView().addDependent(this._dialog[sFragmentName]);
			}
			this._dialog[sFragmentName].open();
		},

		/**
		 * Opens the Dialog for simualtion configuraiton
		 */
		handleCustSettings: function() {
			this._openDialog("SimIncDecCust");
		},

		/**
		 * Closes the Dialog for simualtion configuraiton
		 */
		onSimCustCancel: function() {
			this._dialog.SimIncDecCust.close();
		},

		/**
		 * Saves the simulation config to local storage
		 */
		onSimCustSave: function() {
			this._dialog.SimIncDecCust.close();
			var oSimConfig = this.getView().getModel("simConfig").getData(),
				oStore = jQuery.sap.storage(jQuery.sap.storage.Type.local);
			oStore.remove("simUserConfig");
			oStore.put("simUserConfig", oSimConfig);

			this._incSpeed = oSimConfig.IncSpeed;
			this._decSpeed = oSimConfig.DecSpeed;
		},

		/**
		 * Fetches the Configuaration based on the config name
		 */
		_fetchConfigValue: function(sKey, that) {
			if (that.getOwnerComponent().getModel("configurations")) {
				var oData = that.getOwnerComponent().getModel("configurations").getData().configurations,
					sValue;
				oData.some(function(sItem) {
					if (sItem.Name === sKey) {
						sValue = sItem.Value;
						return true;
					}
				});
				return sValue;
			}
		}

	});

});