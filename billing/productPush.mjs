import {onDocumentCreated,onDocumentUpdated} from 'firebase-functions/v2/firestore';
import {TRIGGER,ownerDevices,teamDevices,customerDevices,sendNotification} from './deliveryCommon.mjs';

const validId=id=>typeof id==='string'&&/^APO-\d{8}-[A-F0-9]{8}$/.test(id);
export const notifyNewAnkurProductOrder=onDocumentCreated({...TRIGGER,document:'product_orders/{orderId}'},async event=>{
 const order=event.data?.data();if(!order||order.billingVersion!==2||order.isTrash===true||!validId(order.orderId)||order.orderId!==event.params.orderId)return;
 // Public push includes no name, phone, address, price or private tracking capability.
 await sendNotification([...await ownerDevices(),...await teamDevices()], 'New Ankur Product Order', 'Order '+order.orderId+' received.',{type:'new_order',orderId:order.orderId},event);
});
export const notifyAnkurProductOrderProgress=onDocumentUpdated({...TRIGGER,document:'product_order_tracking/{trackingToken}'},async event=>{
 const before=event.data?.before?.data(),after=event.data?.after?.data();
 if(!before||!after||after.billingVersion!==2||!validId(after.orderId)||event.params.trackingToken!==after.orderId+'_'+event.params.trackingToken?.split('_').at(-1)||!/^\d{6}$/.test(event.params.trackingToken?.split('_').at(-1)))return;
 const statusChanged=before.status!==after.status,paymentChanged=before.paymentStatus!==after.paymentStatus;if(!statusChanged&&!paymentChanged)return;
 const title=statusChanged?({pending:'Order Received',confirmed:'Order Confirmed',in_packing:'Packing Your Order',dispatched:'Order Dispatched',delivered:'Order Delivered',cancelled:'Order Cancelled'}[after.status]||'Order Updated'):after.paymentStatus==='payment_verified'?'Payment Verified':'Payment Update';
 await sendNotification([...await customerDevices(event.params.trackingToken),...await ownerDevices()],title,'Order '+after.orderId+' has an update.',{type:statusChanged?'order_status':'payment_status',orderId:after.orderId,status:after.status||'',paymentStatus:after.paymentStatus||''},event);
});
