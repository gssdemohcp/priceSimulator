sap.ui.define([
	"com/sd/price/sim/util/Controller",
	"com/sd/price/sim/util/Formatter",
	"sap/ui/Device",
	"sap/m/MessageBox",
	"sap/m/MessageToast",
	"sap/ui/model/json/JSONModel"
], function(Controller, Formatter, Device, MessageBox, MessageToast, JSONModel) {
	"use strict";

	return Controller.extend("com.sd.price.sim.controller.Detail", {
		/**
		 * Called when the detail list controller is instantiated. 
		 */
		onInit: function() {
			this.oInitialLoadFinishedDeferred = jQuery.Deferred();
			this._bMessageOpen = false;
			this._sErrorText = this.getResourceBundle().getText("errorText");

			if (Device.system.phone) {
				//don't wait for the master on a phone
				this.oInitialLoadFinishedDeferred.resolve();
			} else {
				this.getView().setBusy(true);
				this.getEventBus().subscribe("Master", "InitialLoadFinished", this.onMasterLoaded, this);
			}

			this.getRouter().attachRouteMatched(this.onRouteMatched, this);

		},

		/**
		 * online icon formatter
		 */
		onlineIconVisible: function(bIsOffline, bIsPhone) {
			return bIsPhone && bIsOffline;
		},

		/**
		 * Master InitialLoadFinished event handler
		 * @param{String} sChanel event channel name
		 * @param{String}} sEvent event name
		 * @param{Object}} oData event data object
		 */
		onMasterLoaded: function(sChannel, sEvent, oData) {
			if (oData.oListItem) {
				this.bindView(oData.oListItem.getBindingContext().getPath());
				this.getView().setBusy(false);
				this.oInitialLoadFinishedDeferred.resolve();
			}
		},

		/**
		 * Detail view RoutePatternMatched event handler 
		 * @param{sap.ui.base.Event} oEvent router pattern matched event object
		 */
		onRouteMatched: function(oEvent) {
			var oParameters = oEvent.getParameters();

			jQuery.when(this.oInitialLoadFinishedDeferred).then(jQuery.proxy(function() {

				// when detail navigation occurs, update the binding context
				if (oParameters.name !== "detail" || oParameters.arguments.entity === "Simulation") {
					return;
				}

				var sEntityPath = "/" + oParameters.arguments.entity;

				// var aFilters = [];
				// this.getView().byId("searchField").setValue("");
				// aFilters = [new sap.ui.model.Filter("MaktxSearch", sap.ui.model.FilterOperator.Contains, "")];

				// // update list binding
				// var list = this.getView().byId("materialsTable");
				// list.getBinding("items").filter(aFilters);

				this._Path = sEntityPath;
				this.bindView(sEntityPath);
			}, this));

		},

		/**
		 * Binds the view to the object path.
		 * @param {string} sEntityPath path to the entity
		 */
		bindView: function(sEntityPath) {
			var oView = this.getView();

			// Clear all the filters applied to the Material Table
			this.getView().byId("materialsTable").getBinding("items").aFilters = [];

			// Do element binding for the customer id
			oView.bindElement({
				path: sEntityPath,
				events: {
					dataRequested: function() {
						oView.setBusy(true);
					},
					dataReceived: function() {
						oView.setBusy(false);
					}
				}
			});

			//Check if the data is already on the client
			if (!oView.getModel().getData(sEntityPath)) {

				// Check that the entity specified actually was found.
				oView.getElementBinding().attachEventOnce("dataReceived", jQuery.proxy(function() {
					var oData = oView.getModel().getData(sEntityPath);
					if (!oData) {
						this.showEmptyView();
						this.fireDetailNotFound();
					} else {
						this.fireDetailChanged(sEntityPath);
					}
				}, this));

			} else {
				this.fireDetailChanged(sEntityPath);
			}

		},

		/**
		 * display NotFound view
		 */
		showEmptyView: function() {
			this.getRouter().myNavToWithoutHash({
				currentView: this.getView(),
				targetViewName: "com.sd.price.sim.view.NotFound",
				targetViewType: "XML"
			});
		},

		/**
		 * publish Detail Changed event
		 * @param {string} sEntityPath path to the entity
		 */
		fireDetailChanged: function(sEntityPath) {
			this.getEventBus().publish("Detail", "Changed", {
				sEntityPath: sEntityPath
			});
		},

		/**
		 * publish Detail NotFound event
		 */
		fireDetailNotFound: function() {
			this.getEventBus().publish("Detail", "NotFound");
		},

		/**
		 * Navigates back to main view
		 */
		onNavBack: function() {
			// This is only relevant when running on phone devices
			var model = this.getView().getModel();
			if (model.hasPendingChanges() || model.newEntryContext) {
				this.openCancelConfirmDialog(jQuery.proxy(function() {
					this.getRouter().myNavBack("main");
				}, this));
			} else {
				this.getRouter().myNavBack("main");
			}
		},

		/**
		 * Detail view icon tab bar select event handler
		 * @param {sap.ui.base.Event} oEvent deta view select event object
		 */
		onDetailSelect: function(oEvent) {
			sap.ui.core.UIComponent.getRouterFor(this).navTo("detail", {
				entity: oEvent.getSource().getBindingContext().getPath().slice(1),
				tab: oEvent.getParameter("selectedKey")
			}, true);
		},

		/**
		 * For Saving the Customer as a favourite for a Sales Rep
		 * @param {oEvent} Favourite Icon Event Handler
		 */
		processFavourite: function() {
			var oData = {},
				sMessage;
			oData = this.getView().getElementBinding().getBoundContext().getObject();
			if (oData.FavCust === "X") {
				oData.FavCust = " ";
				sMessage = "UnMarked as Favourite Customer";
			} else {
				oData.FavCust = "X";
				sMessage = "Marked as Favourite Customer";
			}
			// this.getView().

			this.getView().getModel().update(this._Path, oData, {
				success: jQuery.proxy(function() {
					MessageToast.show(sMessage);
				}, this),
				async: true
			});
		},

		/**
		 * For Searching the materials based on the material description
		 * @param {oEvent} Favourite Icon Event Handler
		 */
		onSearch: function() {
			// add filter for search
			var aFilters = [];
			var searchString = this.getView().byId("searchField").getValue();
			if (searchString && searchString.length > 0) {
				searchString = searchString.toUpperCase();
				aFilters = [new sap.ui.model.Filter("MaktxSearch", sap.ui.model.FilterOperator.Contains, searchString)];
			}
			// update list binding
			var list = this.getView().byId("materialsTable");
			list.getBinding("items").filter(aFilters);
		},
		/**
		 * Material Navigation to the Simulation Screen
		 * @param {oEvent} Event contains the pressed table item data
		 */
		onSelect: function(oEvent) {
			var oMasterData = this.getView().getElementBinding().getBoundContext().getObject();
			var oCust = {
				Name1: oMasterData.Name1
			};
			var oData = jQuery.extend(oCust, oEvent.getSource().getBindingContext().getObject());

			var oModel = new JSONModel(oData);
			this.getOwnerComponent().setModel(oModel, "simulationModel");
			this.getRouter().navTo("Simulation");
		},

		/**
		 * Shows a {@link sap.m.MessageBox} when a service call has failed.
		 * Only the first error message will be display.
		 * @param {string} sDetails a technical error to be displayed on request
		 * @private
		 */
		_showServiceError: function(sDetails) {
			MessageBox.error(
				this._sErrorText, {
					id: "serviceErrorMessageBox",
					details: sDetails,
					styleClass: this.getOwnerComponent().getContentDensityClass(),
					actions: [MessageBox.Action.CLOSE]
				}
			);
		}
	});
});