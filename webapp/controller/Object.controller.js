/*global location*/
sap.ui.define([
		"fts/cockpit/controller/BaseController",
		"sap/ui/model/json/JSONModel",
		"sap/ui/core/routing/History",
		"fts/cockpit/model/formatter",
		"sap/ui/model/Filter"
	], function (
		BaseController,
		JSONModel,
		History,
		formatter,
		Filter
	) {
		"use strict";

		return BaseController.extend("fts.cockpit.controller.Object", {

			formatter: formatter,

			/* =========================================================== */
			/* lifecycle methods                                           */
			/* =========================================================== */

			/**
			 * Called when the worklist controller is instantiated.
			 * @public
			 */
			onInit : function () {
				// Model used to manipulate control states. The chosen values make sure,
				// detail page is busy indication immediately so there is no break in
				// between the busy indication for loading the view's meta data
				var iOriginalBusyDelay,
					oViewModel = new JSONModel({
						busy : true,
						delay : 0,
						editFlightData: false
					});

				this.getRouter().getRoute("object").attachPatternMatched(this._onObjectMatched, this);

				// Store original busy indicator delay, so it can be restored later on
			 iOriginalBusyDelay = this.getView().getBusyIndicatorDelay();
				this.setModel(oViewModel, "objectView");
				this.getOwnerComponent().getModel().metadataLoaded().then(function () {
						// Restore original busy indicator delay for the object view
						oViewModel.setProperty("/delay", iOriginalBusyDelay);
					}
				);
			},

			/* =========================================================== */
			/* event handlers                                              */
			/* =========================================================== */

			/**
			 * Event handler when the share in JAM button has been clicked
			 * @public
			 */
			onShareInJamPress : function () {
				var oViewModel = this.getModel("objectView"),
					oShareDialog = sap.ui.getCore().createComponent({
						name: "sap.collaboration.components.fiori.sharing.dialog",
						settings: {
							object:{
								id: location.href,
								share: oViewModel.getProperty("/shareOnJamTitle")
							}
						}
					});
				oShareDialog.open();
			},

			/**
			 * Event handler  for navigating back.
			 * It there is a history entry or an previous app-to-app navigation we go one step back in the browser history
			 * If not, it will replace the current entry of the browser history with the worklist route.
			 * @public
			 */
			onNavBack : function() {
					this.getRouter().navTo("worklist", {}, true);
					this.getModel("objectView").setProperty("/editFlightData", false);
			},

			/* =========================================================== */
			/* internal methods                                            */
			/* =========================================================== */

			/**
			 * Binds the view to the object path.
			 * @function
			 * @param {sap.ui.base.Event} oEvent pattern match event in route 'object'
			 * @private
			 */
			_onObjectMatched : function (oEvent) {
		 	var sObjectId =  oEvent.getParameter("arguments").objectId;
		 	var sFlightNo = oEvent.getParameter("arguments").flightNo;
				this.getModel().metadataLoaded().then( function() {
					var sObjectPath = this.getModel().createKey("FlightSegmentHeaderSet", {
						Preaufnr :  sObjectId,
						Aufnr :  sFlightNo
					});
					this._bindView("/" + sObjectPath);
				}.bind(this));
				
			
			this.fnArrivalPassangerDetails(sObjectId, sFlightNo);
			this.fnDeparturePassangerDetails(sObjectId, sFlightNo);
			this._onFlightService(oEvent, sObjectId, sFlightNo);
			this.fnCargoCharges(sObjectId, sFlightNo);
			},
			
			fnArrivalPassangerDetails : function(sSourceFlight, sDestFlight) {
				var that = this;
				var requestUri = "FlightSegmentHeaderSet" + "(" + "Preaufnr='" + sSourceFlight + "'"+",Aufnr="+"'"+sDestFlight+"'" + ")" + "/FlightSegmentHeaderInboundPax";
				this.getOwnerComponent().getModel().read("/" + requestUri, {
				success: function (sArrivalflightData, sArrivalResponse) {
					if (sArrivalflightData !== undefined) {
						var oArrivalFlightData = new JSONModel({
						oData: sArrivalflightData
					});
					that.getOwnerComponent().setModel(oArrivalFlightData, "oPassangerModel");
					}
				},
				error: function (data, response) {
				}
			});
			},
			
			fnDeparturePassangerDetails : function(sSourceFlight, sDestFlight) {
				var that = this;
				var requestUri = "FlightSegmentHeaderSet" + "(" + "Preaufnr='" + sSourceFlight + "'"+",Aufnr="+"'"+sDestFlight+"'" + ")" + "/FlightSegmentHeaderOutboundPax";
				this.getOwnerComponent().getModel().read("/" + requestUri, {
				success: function (sDepartureflightData, sArrivalResponse) {
					if (sDepartureflightData !== undefined) {
						var oDepartureFlightData = new JSONModel({
						oData: sDepartureflightData
					});
					that.getOwnerComponent().setModel(oDepartureFlightData, "oDeparturePassangerModel");
					}
				},
				error: function (data, response) {
				}
			});
			},
			
			
		  _onFlightService : function(oEvent, sPreaufnr, sAufnr){
				var that = this;
				//var oDatWithAdditinalFlag =[];
				var oArrivalFlightChargesALVData =[];
				var oDepartureFlightChargesALVData =[];
				var oArrivalDataWithoutAdditionalFlag=[];
				var oDepartureDataWithoutAdditionalFlag=[];
				//FlightSegmentItemSet
				var requestUri = "FlightSegmentHeaderSet" + "(" + "Preaufnr='" + sPreaufnr + "'"+",Aufnr="+"'"+sAufnr+"'" + ")" + "/FlightSegmentItemSetAC";
				this.getOwnerComponent().getModel().read("/" + requestUri, {
				success: function (flightData, sResponse) {
					if (flightData !== undefined) {
						
					flightData.results.forEach(function (idx, object) {
					 if(idx.AdditionalFlag==='' && idx.Direction===1){
					 	oArrivalFlightChargesALVData.push(idx);
					 }else if(idx.AdditionalFlag==='' && idx.Direction===2){
					 	oDepartureFlightChargesALVData.push(idx);
					 }else if(idx.AdditionalFlag==='X' && idx.Direction===1){
					 	oArrivalDataWithoutAdditionalFlag.push(idx);
					} else if(idx.AdditionalFlag==='X' && idx.Direction===2){
					 	oDepartureDataWithoutAdditionalFlag.push(idx);
					 }
					});
					var oArrivalFlightChargesData = new JSONModel({
						Data: oArrivalFlightChargesALVData//flightData.results
					});
					var oDepartFlightChargesData = new JSONModel({
						oDepartFlightData: oDepartureFlightChargesALVData
					});
					
				
					var oArrivalAdditionalFlightChargesData = new JSONModel({
						Data: oArrivalDataWithoutAdditionalFlag//flightData.results
					});
					var oDepartAdditionalFlightChargesData = new JSONModel({
						//oDepartAddFlightChargesData: flightData.results
						oDepartAddFlightChargesData: oDepartureDataWithoutAdditionalFlag
					});
					
					// Arrival Flight Chares 
					that.getOwnerComponent().setModel(oArrivalFlightChargesData, "oArrivalFlightChargesModel");
					
					// Departure Airport Charges
					that.getOwnerComponent().setModel(oDepartFlightChargesData, "oDepartureFlightChargesModel");
					
					//Arrival Flight Charges - Addditional Service Popup Model.
					that.getOwnerComponent().setModel(oArrivalAdditionalFlightChargesData, "oAdditinalFlightServiceModel");
					
					//Departure Flight Charges - Addditional Service Popup Model.
					that.getOwnerComponent().setModel(oDepartAdditionalFlightChargesData, "oDepartureAdditionalServiceFlightModel");
					}
				},
				error: function (data, response) {
				}
			});

		  },

         fnCargoCharges: function(sPreaufnr, sAufnr){
				var that = this;
				var requestUri = "FlightSegmentHeaderSet" + "(" + "Preaufnr='" + sPreaufnr + "'"+",Aufnr="+"'"+sAufnr+"'" + ")" + "/FlightSegmentItemSetCG";
				this.getOwnerComponent().getModel().read("/" + requestUri, {
				success: function (sflightCargoData, sResponse) {
					if (sflightCargoData !== undefined) {
						var oFlightCargoData = new JSONModel({
						oData: sflightCargoData.results
					});
					that.getOwnerComponent().setModel(oFlightCargoData, "oFlightCargoModel");
					}
				},
				error: function (data, response) {
				}
			});
         },
			/**
			 * Binds the view to the object path.
			 * @function
			 * @param {string} sObjectPath path to the object to be bound
			 * @private
			 */
			_bindView : function (sObjectPath) {
				var oViewModel = this.getModel("objectView"),
					oDataModel = this.getModel();

				this.getView().bindElement({
					path: sObjectPath,
					events: {
						change: this._onBindingChange.bind(this),
						dataRequested: function () {
							oDataModel.metadataLoaded().then(function () {
								// Busy indicator on view should only be set if metadata is loaded,
								// otherwise there may be two busy indications next to each other on the
								// screen. This happens because route matched handler already calls '_bindView'
								// while metadata is loaded.
								oViewModel.setProperty("/busy", true);
							});
						},
						dataReceived: function () {
							oViewModel.setProperty("/busy", false);
						}
					}
				});
			},

			_onBindingChange : function () {
				var oView = this.getView(),
					oViewModel = this.getModel("objectView"),
					oElementBinding = oView.getElementBinding();

				// No data for the binding
				if (!oElementBinding.getBoundContext()) {
					this.getRouter().getTargets().display("objectNotFound");
					return;
				}

				var oResourceBundle = this.getResourceBundle(),
					oObject = oView.getBindingContext().getObject(),
					sObjectId = oObject.Preaufnr,
					sObjectName = oObject.Aircrafttype;

				// Everything went fine.
				oViewModel.setProperty("/busy", false);
				oViewModel.setProperty("/saveAsTileTitle", oResourceBundle.getText("saveAsTileTitle", [sObjectName]));
				oViewModel.setProperty("/shareOnJamTitle", sObjectName);
				oViewModel.setProperty("/shareSendEmailSubject",
				oResourceBundle.getText("shareSendEmailObjectSubject", [sObjectId]));
				oViewModel.setProperty("/shareSendEmailMessage",
				oResourceBundle.getText("shareSendEmailObjectMessage", [sObjectName, sObjectId, location.href]));
			},
			fnEditFilghtOrder : function(oEvent){
				this.getModel("objectView").setProperty("/editFlightData", true);
			},
			fnDisplayFilghtOrder : function(oEvent){
				this.getModel("objectView").setProperty("/editFlightData", false);
			},
			fnOnSubmitFlightData: function(oEvent){
			//	alert("Submit");
			},
			/*
			***********************************************
			Arrival Airport Charges  - Additional Services.
			**********************************************
			*/
			fnOpenAdditionalServicesDailog: function(oEvent){
			  if (!this._oAdditionalServiceDailog) {
				this._oAdditionalServiceDailog = sap.ui.xmlfragment(this.createId("frgAdditionalService"), "fts.cockpit.fragments.ArriAirportChargesAdditionalServices", this);
				this.getView().addDependent(this._oAdditionalServiceDailog);
			 }
			 this._oAdditionalServiceDailog.open();
			},
			fnOnCancelAdditionalServicesDailog: function (oEvent) {
			this._oAdditionalServiceDailog.close();
			this._oAdditionalServiceDailog.destroy();
			delete this._oAdditionalServiceDailog;
		},
			/***********************************************
			START Arrival Airport Charges Popup Data Transfer - Additional Services.
			**********************************************
			*/
		fnAddAdditionalServices: function(oEvent){
			var that =this;
			var aContexts = oEvent.getParameter("selectedContexts");
			if (aContexts && aContexts.length) {
				 aContexts.map(function(oContext) {
				 	that.getModel('oArrivalFlightChargesModel').getData().Data.push({
				 		"Direction": oContext.getObject().Direction ,
				 		"CtrVendorDesc": oContext.getObject().CtrVendorDesc,
				 		"SrvcDesc": oContext.getObject().SrvcDesc,
				 		"Price": oContext.getObject().Price,
				 		"Quantity": oContext.getObject().Quantity,
				 		"TotalPrice": oContext.getObject().TotalPrice,
				 		"CtrWaers": oContext.getObject().CtrWaers,
				 		"CtrUsageType": oContext.getObject().CtrUsageType,
				 		"AdditionalFlag" :oContext.getObject().AdditionalFlag
				 	});
				 	that.getView().getModel('oArrivalFlightChargesModel').updateBindings(true);
				 });
				 
				this.fnDeleteArrivFlightChargesPopUpModelData(oEvent, "oAdditinalFlightServiceModel", "Data", aContexts);
			}
		},
		
		fnDeleteArrivFlightChargesPopUpModelData : function(oEvent, oModel, oDataCollection,  aContexts){
			var sIndex, sModelIndex, that = this, arr = [];
			if (aContexts && aContexts.length) { 
				 for (var i = aContexts.length - 1; i >= 0; i--) {
				 		sIndex = aContexts[i].sPath.split("/")[2];
				 		sModelIndex = parseInt(sIndex, []);
						var oModelReference = that.getView().getModel(oModel);
						var oModelReferenceData = oModelReference.getData();
						oModelReferenceData[oDataCollection].splice(sModelIndex, 1);
						oModelReference.setData(oModelReferenceData);
					/*	arr = oModelReference.getData();
						arr[oDataCollection].splice(sModelIndex, 1);
						oModelReference.setData(arr);*/
				 }
				}
				that.getView().getModel(oModel).updateBindings(true);
		
		},
		
		fnOnDeleteArrivalAirportCharges : function(oEvent){
			var  sModelIndex, that = this;
			var sSecltectIndex =  oEvent.getSource().getId().split('arrivalFlightService-')[1];
			var oSelctedDeptFlightData = that.getModel('oArrivalFlightChargesModel').getData().Data[parseInt(sSecltectIndex, [])];
			if (oSelctedDeptFlightData !== undefined) {
				 	// Add in Additonal Charges Popup Model.
				 	that.getModel('oAdditinalFlightServiceModel').getData().Data.push({
				 		"Direction": oSelctedDeptFlightData.Direction ,
				 		"CtrVendorDesc": oSelctedDeptFlightData.CtrVendorDesc,
				 		"SrvcDesc": oSelctedDeptFlightData.SrvcDesc,
				 		"Price": oSelctedDeptFlightData.Price,
				 		"Quantity": oSelctedDeptFlightData.Quantity,
				 		"TotalPrice": oSelctedDeptFlightData.TotalPrice,
				 		"CtrWaers": oSelctedDeptFlightData.CtrWaers,
				 		"CtrUsageType":oSelctedDeptFlightData.CtrUsageType,
				 		"AdditionalFlag" : oSelctedDeptFlightData.AdditionalFlag
				 	});
				 	that.getView().getModel('oAdditinalFlightServiceModel').updateBindings(true);
				 	 // del from AVL Departure Airport Charges
				 		sModelIndex = parseInt(sSecltectIndex, []);
						var oModelReference = that.getView().getModel('oArrivalFlightChargesModel');
						var oModelReferenceData = oModelReference.getData();
						oModelReferenceData.Data.splice(sModelIndex, 1);
						oModelReference.setData(oModelReferenceData);
						
						that.getView().getModel('oArrivalFlightChargesModel').updateBindings(true);
			}
		
		},
			/***********************************************
			END Arrival Airport Charges Popup Data Transfer - Additional Services.
			**********************************************
			*/
		fnOnAdditionalServiceSearch : function(oEvent){
			var sValue = oEvent.getParameter("value");
			var oFilter = new Filter(
				"CtrVendorDesc", sap.ui.model.FilterOperator.Contains, sValue
				//CtrVendorDesc //SrvcCode
			);
			var additionalServiceBindingContest = oEvent.getSource().getBinding("items");
			additionalServiceBindingContest.filter([oFilter]);
		
		},
		
			/*
			***********************************************
			Departure Airport Charges  - Additional Services.
			**********************************************
			*/
			fnOpenDepartureAdditionalChargesDailog: function(oEvent){
			  if (!this._oDepartureAdditionalServiceDailog) {
				this._oDepartureAdditionalServiceDailog = sap.ui.xmlfragment(this.createId("frgDepartAdditionalService"), "fts.cockpit.fragments.DeptAirportChargesAdditionalServices", this);
				this.getView().addDependent(this._oDepartureAdditionalServiceDailog);
			 }
			 this._oDepartureAdditionalServiceDailog.open();
			},
		/*fnOnCancelDepartureAdditionalChargesDailog: function (oEvent) {
			this._oDepartureAdditionalServiceDailog.close();
			this._oDepartureAdditionalServiceDailog.destroy();
			delete this._oDepartureAdditionalServiceDailog;
		},*/
		fnAddDepartureAdditionalCharges: function(oEvent){
			var that = this;
			var aContexts = oEvent.getParameter("selectedContexts");
			if (aContexts && aContexts.length) {
				 aContexts.map(function(oContext) {
				 	that.getModel('oDepartureFlightChargesModel').getData().oDepartFlightData.push({
				 		"Direction": oContext.getObject().Direction ,
				 		"CtrVendorDesc": oContext.getObject().CtrVendorDesc,
				 		"SrvcDesc": oContext.getObject().SrvcDesc,
				 		"Price": oContext.getObject().Price,
				 		"Quantity": oContext.getObject().Quantity,
				 		"TotalPrice": oContext.getObject().TotalPrice,
				 		"CtrWaers": oContext.getObject().CtrWaers,
				 		"CtrUsageType": oContext.getObject().CtrUsageType,
				 		"AdditionalFlag" : oContext.getObject().AdditionalFlag
				 	});
				 	that.getView().getModel('oDepartureFlightChargesModel').updateBindings(true);
				 	
				 });
			}
			this.fnDeleteFlightChargesModelData(oEvent, 'oDepartureAdditionalServiceFlightModel', 'oDepartAddFlightChargesData', aContexts);
		},
		fnOnDepartueAdditionalChargesSearch : function(oEvent){
			var sValue = oEvent.getParameter("value");
			var oFilter = new Filter(
				"CtrVendorDesc", sap.ui.model.FilterOperator.Contains, sValue
			);
			var additionalServiceBindingContest = oEvent.getSource().getBinding("items");
			additionalServiceBindingContest.filter([oFilter]);
		
		},
		
		fnDeleteFlightChargesModelData : function(oEvent, oModel, oModelDataCollection, aContexts){
			var sIndex, sModelIndex, that = this;
			if (aContexts && aContexts.length) { 
				 //aContexts.forEach(function(idx, object){
				 for (var i = aContexts.length - 1; i >= 0; i--) {
				     //newArray.push(arr[i]);
				 //	sIndex = idx.sPath.split("/")[2];
				 		sIndex = aContexts[i].sPath.split("/")[2];
				 		sModelIndex = parseInt(sIndex, []);
						var oModelReference = that.getView().getModel(oModel);
						var oModelReferenceData = oModelReference.getData();
						oModelReferenceData.oDepartAddFlightChargesData.splice(sModelIndex, 1);
						oModelReference.setData(oModelReferenceData);
				 //});
				 }
				}
				that.getView().getModel(oModel).updateBindings(true);
		
		},
		fnOnDeleteDepatAirportCharges : function(oEvent){
			var  sModelIndex, that = this;
			var sSecltectIndex =  oEvent.getSource().getId().split('departureFlightService-')[1];
			var oSelctedDeptFlightData = that.getModel('oDepartureFlightChargesModel').getData().oDepartFlightData[parseInt(sSecltectIndex, [])];
			if (oSelctedDeptFlightData !== undefined) {
				 	// Add in Additonal Charges Popup Model.
				 	that.getModel('oDepartureAdditionalServiceFlightModel').getData().oDepartAddFlightChargesData.push({
				 		"Direction": oSelctedDeptFlightData.Direction ,
				 		"CtrVendorDesc": oSelctedDeptFlightData.CtrVendorDesc,
				 		"SrvcDesc": oSelctedDeptFlightData.SrvcDesc,
				 		"Price": oSelctedDeptFlightData.Price,
				 		"Quantity": oSelctedDeptFlightData.Quantity,
				 		"TotalPrice": oSelctedDeptFlightData.TotalPrice,
				 		"CtrWaers": oSelctedDeptFlightData.CtrWaers,
				 		"CtrUsageType":oSelctedDeptFlightData.CtrUsageType,
				 		"AdditionalFlag" : oSelctedDeptFlightData.AdditionalFlag
				 	});
				 	that.getView().getModel('oDepartureAdditionalServiceFlightModel').updateBindings(true);
				 	 // del from AVL Departure Airport Charges
				 		sModelIndex = parseInt(sSecltectIndex, []);
						var oModelReference = that.getView().getModel('oDepartureFlightChargesModel');
						var oModelReferenceData = oModelReference.getData();
						oModelReferenceData.oDepartFlightData.splice(sModelIndex, 1);
						oModelReference.setData(oModelReferenceData);
						
						that.getView().getModel('oDepartureFlightChargesModel').updateBindings(true);
				
			}
		}
		

		});

	}
);