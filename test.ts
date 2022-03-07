import { Component, OnInit, Input, OnDestroy } from '@angular/core';
import { formatDate } from '@angular/common';
import { FormGroup, Validators, FormBuilder } from '@angular/forms';
import { Router } from '@angular/router';
import { CustomersService } from '../../../services/customers.service';
import { CalendarioService } from '../../../services/calendario.service';
import { GenericResponse } from '../../../interfaces/GenericResponse';
import { Cliente, Servicios, ClienteDirecciones, Telefonos, } from '../../../interfaces/cliente'; import { Eventos } from '../../../interfaces/eventos';
import { Eventos as mEventos } from '../../../models/eventos';
import { ToastrService } from 'ngx-toastr';
import { SelectItem } from 'primeng/api';
import { Validations } from '../../../../environments/environment.base';
import { ConfiguradorService } from '../../../services/configurador.service';
import { Renovavilidad } from '../../../interfaces/renovavilidad';
import { OrdenTrabajo } from '../../../interfaces/ordenTrabajo';
import { Observable, Subscription } from 'rxjs';
import { AppState } from '@state/app.state';
import { select, Store } from '@ngrx/store';
import { IClientActionButton } from '@interface/client-action-button';
import { LoadCheckClientActionLog, LoadSaveClientActionLog, } from '@actions/configurador.actions'; import { QuestionModalComponent } from '@page/question-modal/question-modal.component';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { growDown } from '../../../animations/grow-down-up.animation';
import { rotate180 } from '../../../animations/rotate-180.animation';
import { ModalNbaPegaRechazoComponent } from '../shared/modal-nba-pega-rechazo/modal-nba-pega-rechazo.component';
import { CONFIG } from './ficha-cliente.config';
import { CuestionarioNBAsModel } from 'src/app/models/cuestionario-nbas.model';
import { IHistoricoOferta } from '@interface/historico-oferta.interface';
import { UsuariosService } from '@service/usuarios.service';
import { environment } from 'src/environments/environment';
import _regex from 'src/app/helpers/_regex.helper';
import { WarningModalComponent } from '../../warning-modal/warning-modal.component';
import _hardCoded from 'src/app/helpers/_hardcoded.helper';
import { IClienteServicio } from '@interface/IClienteServicio';

const TAREA_EN_PROCESO = 0;
const TAREA_OK = 1;
const TAREA_KO = 2;

@Component({
selector: 'app-ficha-cliente',
templateUrl: './ficha-cliente.component.html',
styleUrls: ['./ficha-cliente.component.css'],
animations: [growDown, rotate180]
})
export class FichaClienteComponent implements OnInit, OnDestroy {
@Input('busqueda') busqueda: Cliente;

subscriptions: Subscription = new Subscription();

public loadingModal$: Observable<boolean>;
public shouldDisplayModal$: Observable<boolean>;
public clientActions$: Observable<IClientActionButton[]>;
public config = CONFIG;
public cuestionarioNBAForm: FormGroup;
public showDesgloseCuotas = false;
public showCuestionarioNBAs = false;
public showHistoricoOferta = false;
public desgloseCuotas: IClienteServicio[];
public financiaciones: any[];
public historicoOferta: IHistoricoOferta[];
public loaders = {
desgloseCuotas: false,
estadoNbaPega: false,
historicoOfertasPega: false
};
modalDisplay = false;
form: FormGroup;
formTelefono: FormGroup;
formEvent: FormGroup;

searchF: FormGroup;
modalTelefono: number;
modalNif: string;
rowActive: number;

cliente: Cliente;
clienteServicios: Servicios[];
clienteTelefono: Telefonos[];
clienteDireccion: ClienteDirecciones[];
// selClienteD: ClienteDirecciones;
clienteObservaciones: string;
clienteEventos: Eventos[] = [];
ofertaContratada: any;
nbas: any[];
nbasPega: any[];
renovavilidad: Renovavilidad[];
ordenesTrabajo: OrdenTrabajo[];
adhoc: any[];

nuevoEvento: Eventos;

numServicios: number;
telSeleccionado: string;
estadoSeleccionado: string;

initNuevoCliente = false;

noValidateForm: boolean;
noValidateFormE: boolean;
noAvailabilityValid: boolean;
submitted = false;

nuevoCliente = false;
pasaPrescoring = true;
loadingServicialidad = false;
isFide = false;
loadingCatalogoFide = false;
loadingRenovavilidad = false;
isNotOn19 = false;
loadingNBAs = false;
nbaRejected = false;
rgpdDirty = false;
rgpdShowMore = false;

tipoDocumento: SelectItem[] = [
{ label: 'N.I.F.', value: 'N.I.F.' },
{ label: 'N.I.E.', value: 'N.I.E.' },
{ label: 'C.I.F.', value: 'C.I.F.' },
{ label: 'PASAPORTE', value: 'PASAPORTE' },
];

ddDireccion: SelectItem[] = [
{
label: 'Seleccione una dirección',
value: { id: 0, name: 'Seleccione una dirección' },
},
];

goNuevoPresupuesto = false;

fecha: Date;
hora: Date;
addingDireccion = false;
editingCliente = false;

direccionSel: any;

tareas = [];
showTareas = false;

constructor(
private customersService: CustomersService,
private calendarioService: CalendarioService,
private toastr: ToastrService,
private router: Router,
private store: Store<AppState>,
private confS: ConfiguradorService,
public fb: FormBuilder,
private modalService: NgbModal,
private usuarioService: UsuariosService
) {
this.setStoreSelectors();
}

ngOnInit(): void {
this.getCustomer(this.customersService.cliente);
this.store.dispatch(
LoadCheckClientActionLog({
clientId: this.customersService.cliente.id.toString(),
})
);

console.log(
'this.cliente?.telefonos[0]?.telefono',
this.cliente?.telefonos[0]?.telefono
);
this.form = this.fb.group({
nif: [
{
value: this.customersService.cliente.nif || '',
disabled: this.nuevoCliente ? false : true,
},
Validators.compose([
Validators.required,
Validators.pattern(Validations.DNI_NIE_VALIDATION),
]),
],
nombre: [
{
value: this.cliente.nombre || '',
disabled: this.nuevoCliente ? false : true,
},
Validators.required,
],
apellidos: [
{
value: this.cliente.apellidos || '',
disabled: this.nuevoCliente ? false : true,
},
Validators.required,
],
email: [
{
value: this.cliente.email || '',
disabled: this.nuevoCliente ? false : true,
},
Validators.required,
],
tipo_documento: [
{
value: this.cliente.tiposDocumento || '',
disabled: this.nuevoCliente ? false : true,
},
Validators.required,
],
razonSocial: [
{
value: this.cliente.razonSocial || '',
disabled: this.nuevoCliente ? false : true,
},
],
segmentoVf: [
{
value: this.cliente.segmentoVf || '',
disabled: this.nuevoCliente ? false : true,
},
Validators.required,
],
nivel_servicio: [
{
value: this.cliente.nivelServicio || '',
disabled: this.nuevoCliente ? false : true,
},
Validators.required,
],
telefonoMovil: [
{
value: this.cliente?.telefonoMovil || '',
disabled: true,
},
],
telefonoFijo: [
{
value: this.cliente?.telefonoFijo || '',
disabled: true,
},
],
telefonoAlt: [
{
value: this.cliente?.telefonoAlt || '',
disabled: true,
},
],
rgpd: [
{
value: this.cliente?.rgpd,
disabled: this.cliente?.rgpd,
},
],
rgpdLocalizacion: [
{
value: this.cliente?.rgpdLocalizacion,
disabled: this.cliente?.rgpdLocalizacion
},
],
rgpdFacturacion: [
{
value: this.cliente?.rgpdFacturacion,
disabled: this.cliente?.rgpdFacturacion
},
],
rgpdOfertas: [
{
value: this.cliente?.rgpdOfertas,
disabled: this.cliente?.rgpdOfertas
},
],
rgpdNoOfertas: [
{
value: this.cliente?.rgpdNoOfertas,
disabled: this.cliente?.rgpdNoOfertas
},
],
rgpdNoOtrasEntidades: [
{
value: this.cliente?.rgpdNoOtrasEntidades,
disabled: this.cliente?.rgpdNoOtrasEntidades
},
],
noTieneMovil: [
{
value: this.cliente?.noTieneMovil,
disabled: true,
},
],
observaciones: [this.clienteObservaciones || '', Validators.required],
});

if (this.cliente.tiposDocumento == 'C.I.F.') {
// Razón Social required si es CIF
this.form.get('razonSocial').setValidators(Validators.required);
this.form.controls.segmentoVf.disable();
}

this.formEvent = this.fb.group({
fecha: ['', Validators.required],
hora: ['', Validators.required],
observaciones: ['', Validators.required],
});
}

/**
* Binds the observables with the part of the store
*/
private setStoreSelectors(): void {
this.loadingModal$ = this.store.pipe(
select(
(state) => state.configurador.fichaCliente.clientActions.loadingModal
)
);
this.shouldDisplayModal$ = this.store.pipe(
select(
(state) =>
state.configurador.fichaCliente.clientActions.shouldDisplayModal
)
);
this.clientActions$ = this.store.pipe(
select(
(state) => state.configurador.fichaCliente.clientActions.clientActions
)
);
}

/**
* Generates the form with the model
*/
private generateCuestionarioForm(): void {
this.cuestionarioNBAForm = this.fb.group(new CuestionarioNBAsModel());
}

/**
* Saves the client action in the database
*/
public saveClientActionLog(actionId: number): void {
this.store.dispatch(
LoadSaveClientActionLog({
clientId: this.customersService.cliente.id,
actionId,
})
);
}

saveClient() { }

// 626256727 - 24842260Y/669560540
getCustomer(cliente) {
console.log('cliente', cliente);

// const nombre = 'Datos del cliente';
// const index = this.gestionTarea(nombre, TAREA_EN_PROCESO);

this.rowActive = undefined;
this.clienteServicios = undefined;
this.cliente = undefined;
this.cliente = cliente;
if (
cliente.clienteObservaciones &&
cliente.clienteObservaciones.length > 0
) {
this.clienteObservaciones = cliente.clienteObservaciones[0].observaciones;
} else {
this.clienteObservaciones = '';
}
// this.gestionTarea(nombre, TAREA_OK, index);
this.getDirecciones();
this.getEvent();
}

// getServiciosTelefono(index) {
// this.clienteServicios = this.cliente.clienteDirecciones[index].servicios;
// this.telSeleccionado = this.cliente.telefonos[index].telefono;
// this.estadoSeleccionado = this.cliente.clienteDirecciones[index].estado;
// this.numServicios = this.clienteServicios.length;
// this.rowActive = index;
// }

getDirecciones() {
// const nombre = 'Direcciones del cliente';
// let index = this.gestionTarea(nombre, TAREA_EN_PROCESO);

let isNewClient = true;

this.clienteDireccion = this.cliente.clienteDirecciones;

if (this.clienteDireccion.length == 1) {
this.selDireccion(0);
}
this.clienteDireccion.forEach((element, index) => {
if (element.idVodafone) {
isNewClient = false;
}
let direccionLabel = `${element.idVodafone ? element.idVodafone : 'Nueva'
} - ${element.tipoVia} ${element.nombreCalle}, ${element.numero}.`;
if (element.escalera) {
direccionLabel += ` Escalera: ${element.escalera}.`;
}
if (element.piso) {
direccionLabel += ` Piso: ${element.piso}.`;
}
if (element.puerta) {
direccionLabel += ` Puerta: ${element.puerta}.`;
}

direccionLabel += ` ${element.poblacion} - ${element.provincia}`;

direccionLabel += element.estado ? ` (${element.estado})` : '';
this.ddDireccion.push({
label: direccionLabel,
value: { id: index, name: element.nombreCalle },
});
});
// this.gestionTarea(nombre, TAREA_OK, index);
}

selDireccion(idDireccion) {
// if (!this.tareas?.length) {
// this.tareas = [];
// } else {
// this.tareas = [...this.tareas[0]];
// }
this.tareas = [];
this.showTareas = true;
// this.selClienteD = this.cliente.clienteDirecciones[idDireccion];
this.cliente.direccionOffer = this.cliente.clienteDirecciones[idDireccion];
this.ofertaContratada = null;
this.nbasPega = null;
this.ordenesTrabajo = undefined;
this.renovavilidad = undefined;
this.nbas = undefined;
this.isNotOn19 = false;
this.financiaciones = null;
this.desgloseCuotas = null;
this.showDesgloseCuotas = false;

if (this.cliente.direccionOffer.estado !== 'Desconectado') {
if (this.cliente.direccionOffer.idVodafone) {
// Cliente Existente
this.isFide = true;
// Consulta NBAs
if (this.cliente.direccionOffer.tipoCliente == 'RS') {
if (this.cliente.direccionOffer.segmentoVf == 'PARTICULAR' || this.cliente.direccionOffer.segmentoVf == 'RESIDENCIAL') {
this.getNbasPega();
}
else {
this.customersService.clienteConProductosMicro(this.customersService.cliente.id, this.customersService.cliente.direccionOffer.id).subscribe((haveProductosMicro: GenericResponse) => {
console.log('haveProductosMicro :>> ', haveProductosMicro);
if (haveProductosMicro.data) { // Si tiene productos de Micro - Chordiant
this.getNBAs();
}
else { // Si no tiene productos de Micro - PEGA
this.getNbasPega();
}
});
}
}
else {
this.getNBAs();
}
// Consulta Catalogo Fide
this.downloadCatalogoFide();
// this.getOrdenesTrabajo();
this.getLimitesOfertasRenovabilidad();
this.getServicialidad();
this.getAdhocFiles();
this.getFinanciaciones();
this.isNotOn19 = this.cliente.direccionOffer.superOferta !== 'ON19';
}
else {
// Nuevo cliente
this.prescoring();
this.getServicialidad();
}
}

this.goNuevoPresupuesto = true;
}

getOfertaContratada() {
const nombre = 'Oferta contratada';
const index = this.gestionTarea(nombre, TAREA_EN_PROCESO);

this.customersService
.getOfertaContratada(this.customersService.cliente.direccionOffer.idCliente, this.customersService.cliente.direccionOffer.id)
.subscribe((r: GenericResponse) => {
if (r.code == 200) {
this.gestionTarea(nombre, TAREA_OK, index);
} else {
this.gestionTarea(nombre, TAREA_KO, index);
}
this.ofertaContratada = r.data;
console.log('this.ofertaContratada', this.ofertaContratada);
});
}

getNbasPega(OfferVFDescriptor: string = null) {
if (this.cliente.direccionOffer.superOferta !== 'ON19') {
return;
}

const nombre = 'NBAs - Ingenio';
const index = this.gestionTarea(nombre, TAREA_EN_PROCESO);
this.loadingNBAs = true;

this.nbas = undefined;

const nbasPegaBackup = JSON.stringify(this.nbasPega);
this.nbasPega = [];
setTimeout(() => {
this.customersService
.getNbasPega(this.cliente.id, this.cliente.direccionOffer.id, this.confS.sfidOffer, this.cuestionarioNBAForm && this.cuestionarioNBAForm.value ? this.cuestionarioNBAForm.value : undefined, OfferVFDescriptor)
.subscribe((r: GenericResponse) => {
if (r.code == 200) {
this.nbasPega = r.data;
console.log('this.nbasPega', this.nbasPega);
this.loadingNBAs = false;
this.gestionTarea(nombre, TAREA_OK, index);
this.generateCuestionarioForm();
this.showCuestionarioNBAs = false;
if (!!OfferVFDescriptor && this.nbasPega.length === 0) {
this.nbasPega = JSON.parse(nbasPegaBackup);
const modalRef = this.modalService.open(WarningModalComponent);
modalRef.componentInstance.titulo = 'Atención';
modalRef.componentInstance.pregunta = `Esta oferta ya no es elegible para el cliente`;

modalRef.result.then(
async (result) => { }, (reason) => { }
);
} else if (!this.nbasPega.length) {
// Si no hay NBAs de Ingenio, se consulta a Chordiant
this.getNBAs();
}
} else {
this.gestionTarea(nombre, TAREA_KO, index);
this.loadingNBAs = false;
}
});
}, 500);
}

getNBAs() {
const nombre = 'NBAs - Chordiant';
const index = this.gestionTarea(nombre, TAREA_EN_PROCESO);
this.loadingNBAs = true;

this.nbas = undefined;

setTimeout(() => {
this.customersService
.getNbas(this.cliente.id, this.cliente.direccionOffer.id)
.subscribe((r: GenericResponse) => {
if (r.code == 200) {
this.nbas = r.data;
console.log('this.nbas', this.nbas);
this.loadingNBAs = false;
this.gestionTarea(nombre, TAREA_OK, index);
} else {
this.gestionTarea(nombre, TAREA_KO, index);
this.loadingNBAs = false;
}
});
}, 500);
}

downloadCatalogoFide() {
this.loadingCatalogoFide = true;
const nombre = 'Catalogo de fidelización';
const index = this.gestionTarea(nombre, TAREA_EN_PROCESO);

this.customersService.downloadCatalogoFide(this.cliente.direccionOffer.idVodafone).subscribe((r: GenericResponse) => {
if (r.code == 200) {
this.gestionTarea(nombre, TAREA_OK, index);
} else {
this.gestionTarea(nombre, TAREA_KO, index);
}
this.loadingCatalogoFide = false;
// Oferta Contratada
this.getOfertaContratada();
},
(err) => {
this.gestionTarea(nombre, TAREA_KO, index);
this.loadingCatalogoFide = false;
}
);
}

getServicialidad() {
const nombre = 'Consulta Serviciabilidad';
const index = this.gestionTarea(nombre, TAREA_EN_PROCESO);
this.loadingServicialidad = true;

this.customersService
.getServicialidad(
this.cliente.id,
this.cliente.direccionOffer.verticalId,
this.cliente.direccionOffer.horizontalId,
this.cliente.direccionOffer.idVodafone,
this.cliente.direccionOffer.id
)
.subscribe(
(r: GenericResponse) => {
if (r.code == 200) {
console.log(r.data);
this.cliente.direccionOffer.tecnologiaInternet =
r.data.servicialidad;
this.cliente.direccionOffer.velocidadMaxima =
r.data.velocidadMaxima;
this.gestionTarea(nombre, TAREA_OK, index);
} else {
this.gestionTarea(nombre, TAREA_KO, false);
}
this.loadingServicialidad = false;
},
(err) => {
this.gestionTarea(nombre, TAREA_KO, false);
this.loadingServicialidad = false;
}
);
}

getEvent() {
let days = 30; // Days you want to subtract
let daysH = 1; // Days you want to subtract
let date = new Date();
const busqueda = [
{
idCliente: this.cliente.id,
},
];
this.subscriptions.add(
this.calendarioService.getEvents(busqueda).subscribe(
(res: GenericResponse) => {
this.clienteEventos = res.data;
},
(error) => {
this.toastr.error(error, 'Error', {
progressBar: true,
});
})
);
}

prescoring() {
const nombre = 'Prescoring';
const index = this.gestionTarea(nombre, TAREA_EN_PROCESO);

this.subscriptions.add(
this.customersService.prescoring(this.cliente.nif, this.cliente.tiposDocumento, this.cliente.id).subscribe((r: GenericResponse) => {
if (r.code == 200) {
this.pasaPrescoring = r.data;

this.gestionTarea(nombre, TAREA_OK, index);
} else {
this.gestionTarea(nombre, TAREA_KO, index);
}
})
);
}

getLimitesOfertasRenovabilidad() {
this.loadingRenovavilidad = true;
const nombre = 'Ofertas y Renovabilidad';
const index = this.gestionTarea(nombre, TAREA_EN_PROCESO);

this.renovavilidad = undefined;

this.subscriptions.add(
this.customersService.limitesOfertasRenovabilidad(this.cliente.id, this.cliente.direccionOffer.id, this.confS.OfferIdSelected).subscribe((r: GenericResponse) => {
if (r.code == 200) {
this.renovavilidad = r.data;

this.gestionTarea(nombre, TAREA_OK, index);
this.loadingRenovavilidad = false;
} else {
this.gestionTarea(nombre, TAREA_KO, index);
this.loadingRenovavilidad = false;
}
},
(err) => {
this.gestionTarea(nombre, TAREA_KO, index);
this.loadingRenovavilidad = false;
}
)
);
}

getFinanciaciones() {
// this.loadingRenovavilidad = true;
const nombre = 'Financiaciones Activas';
const index = this.gestionTarea(nombre, TAREA_EN_PROCESO);

this.financiaciones = undefined;

this.subscriptions.add(
this.customersService.getFinanciaciones(this.cliente.direccionOffer.idCliente, this.cliente.direccionOffer.id).subscribe((r: GenericResponse) => {
if (r.code == 200) {
this.financiaciones = r.data;

this.gestionTarea(nombre, TAREA_OK, index);
// this.loadingRenovavilidad = false;
} else {
this.gestionTarea(nombre, TAREA_KO, index);
// this.loadingRenovavilidad = false;
}
},
(err) => {
this.gestionTarea(nombre, TAREA_KO, index);
// this.loadingRenovavilidad = false;
}
)
);
}

getRenovavilidad() {
this.loadingRenovavilidad = true;
const nombre = 'Renovabilidad';
const index = this.gestionTarea(nombre, TAREA_EN_PROCESO);

this.renovavilidad = undefined;

this.subscriptions.add(
this.customersService.renovavilidad(this.cliente.direccionOffer.idVodafone).subscribe((r: GenericResponse) => {
if (r.code == 200) {
this.renovavilidad = r.data;

this.gestionTarea(nombre, TAREA_OK, index);
this.loadingRenovavilidad = false;
} else {
this.gestionTarea(nombre, TAREA_KO, index);
this.loadingRenovavilidad = false;
}
},
(err) => {
this.gestionTarea(nombre, TAREA_KO, index);
this.loadingRenovavilidad = false;
}
)
);
}

getOrdenesTrabajo() {
const nombre = 'Ordenes de trabajo';
const index = this.gestionTarea(nombre, TAREA_EN_PROCESO);

this.ordenesTrabajo = undefined;

this.subscriptions.add(
this.customersService.getOrdenesTrabajo(this.cliente.nif, this.cliente.direccionOffer.idVodafone).subscribe((r: GenericResponse) => {
if (r.code == 200) {
this.ordenesTrabajo = r.data;
}
this.gestionTarea(nombre, TAREA_OK, index);
},
(err) => {
this.gestionTarea(nombre, TAREA_KO, index);
}
)
);
}

getAdhocFiles() {
// const nombre = 'Ordenes de trabajo';
// let index = this.gestionTarea(nombre, TAREA_EN_PROCESO);

this.adhoc = undefined;

this.subscriptions.add(
this.confS.getTerminalesAdhoc(this.cliente.id).subscribe((r: GenericResponse) => {
if (r.code === 200) {
this.adhoc = r.data;
}
// this.gestionTarea(nombre, TAREA_OK, index);
},
(err) => {
// this.gestionTarea(nombre, TAREA_KO, index);
}
)
);
}

saveEvent() {
this.nuevoEvento.idCliente = this.cliente.id;
this.subscriptions.add(
this.calendarioService.saveEvents(this.nuevoEvento).subscribe(
(res: GenericResponse) => {
this.clienteEventos.push(this.nuevoEvento);
// this.clienteEventos = res.data;
},
(error) => {
console.log(error);
this.toastr.error(error, 'Error', { progressBar: true });
}
)
);
}

async nuevoPresupuest() {
if (!this.cliente.direccionOffer) {
this.toastr.info('Debe seleccionar una dirección', 'Ooops!', {
progressBar: true,
});
} else if (!this.cliente.direccionOffer.idVodafone && !this.cliente.telefonoMovil && !this.cliente.noTieneMovil) {
// Captación y sin teléfono móvil asignado
this.toastr.info('Debe indicar un teléfono móvil en la ficha de cliente.', 'Ooops!', { progressBar: true });
} else if (!this.cliente.direccionOffer.idVodafone && !this.cliente.telefonoFijo && this.cliente.noTieneMovil) {
// Captación y sin teléfono móvil asignado
this.toastr.info(
'Debe indicar un teléfono móvil en la ficha de cliente.',
'Ooops!',
{ progressBar: true }
);
} else if (!this.cliente.rgpd) {
// Captación y sin RGPD aceptada
this.toastr.info('Debe aceptar la RGPD para poder continuar.', 'Ooops!', {
progressBar: true,
});
} else if (this.isNotOn19) {
// Si no es ON19 no puede continuar por ahora
this.toastr.info(
'RetailX por el momento soporta operaciones de ON19, las activaciones de ON15 o inferiores deberán realizarse por SMART',
'Ooops!',
{ progressBar: true }
);
} else if (!this.cliente.nombre && !this.cliente.direccionOffer.idVodafone) {
// Si no tiene nombre no se puede continuar
this.toastr.info('Debe rellenar el nombre del cliente', 'Ooops!', {
progressBar: true,
});
} else if (!this.cliente.apellidos && !this.cliente.direccionOffer.idVodafone) {
// Si no tiene nombre no se puede continuar
this.toastr.info('Debe rellenar los apellidos del cliente', 'Ooops!', {
progressBar: true,
});
} else if (this.cliente.direccionOffer.estado == 'Desconectado') {
// Si no tiene nombre no se puede continuar
this.toastr.info(
'No se pueden realizar ofertas sobre un id de cliente desconectado, debe crear otra dirección.',
'Ooops!',
{ progressBar: true }
);
} else if (!_regex.EMAIL.test(this.cliente.email)) {
this.toastr.info('El email del cliente es obligatorio', 'Ooops!', { progressBar: true, });
}
else if (this.cliente.direccionOffer.idVodafone && !!this.nbasPega?.length && !await this.getHaveInteraccionesPega()) {
const modalRef = this.modalService.open(QuestionModalComponent);
modalRef.componentInstance.titulo = 'Atención';
modalRef.componentInstance.pregunta = `No has tipificado en la NBA ninguna respuesta del cliente ¿Deseas continuar igualmente?`;
modalRef.componentInstance.btnYes = 'Si';
modalRef.componentInstance.btnNo = 'No';

modalRef.result.then(
async (result) => {
if (result) {
this.router.navigate(['/configurador']);
}
},
(reason) => { }
);
}
else if (this.goNuevoPresupuesto) {
this.router.navigate(['/configurador']);
}
}

addDireccion() {
this.addingDireccion = true;
}

getNuevaDireccion(output: any) {
if (output?.direccion) {
output.direccion.idCliente = this.customersService.cliente.id;
this.subscriptions.add(
this.customersService.addDireccion(output.direccion).subscribe((response: GenericResponse) => {
if (response.code == 200) {
this.customersService.cliente.clienteDirecciones.push(response.data);
const nuevoId = this.ddDireccion.length - 1;
let direccionLabel = `${response.data.tipoVia} ${response.data.nombreCalle}, ${response.data.numero}.`;
if (response.data.piso) {
direccionLabel += ` Piso: ${response.data.piso}.`;
}
if (response.data.puerta) {
direccionLabel += ` Puerta: ${response.data.puerta}.`;
}

direccionLabel += ` ${response.data.poblacion} - ${response.data.provincia}`;

direccionLabel += ` (${response.data.estado ? response.data.estado : 'Nueva'
})`;
this.ddDireccion = [
...this.ddDireccion,
{
label: direccionLabel,
value: { id: nuevoId, name: response.data.nombreCalle },
},
];
this.addingDireccion = false;
this.direccionSel = {
label: direccionLabel,
value: { id: nuevoId, name: response.data.nombreCalle },
};
this.selDireccion(nuevoId);
} else {
this.toastr.error(response.message, 'Ooops!', { progressBar: true, });
}
})
);
} else {
this.addingDireccion = false;
}
}

gestionTarea(nombre, estado, index?) {
if (!index) {
const temp = this.tareas.find((t) => t.nombre == nombre);
if (temp) {
index = this.tareas.indexOf(temp);

index = index == -1 ? this.tareas.length : index;
} else {
index = this.tareas.length;
}
}

this.tareas[index] = { nombre, estado };

return index;
}

setEstadoNBA(idNba: number, idEstado: number) {
if (idEstado === 3) {
const modalRef = this.modalService.open(QuestionModalComponent);
modalRef.componentInstance.titulo = 'Atención';
modalRef.componentInstance.pregunta = `¿Seguro que desea rechazar la NBA? Se procederá a rechazarla en Chordian y no volverá a mostrarse.`;
modalRef.componentInstance.btnYes = 'Si';
modalRef.componentInstance.btnNo = 'No';

modalRef.result.then(
async (result) => {
if (result) {
this.nbaRejected = true;
this.loadingNBAs = true;
this.nbas = undefined;
this.gestionTarea('Consulta de NBAs', TAREA_EN_PROCESO);
await this._setEstadoNBA(idNba, idEstado);
}
},
(reason) => { }
);
} else {
this._setEstadoNBA(idNba, idEstado);
}
}

_setEstadoNBA(idNba: number, idEstado: number) {
this.subscriptions.add(
this.customersService.setEstadoNBA(this.customersService.cliente.id, this.customersService.cliente.direccionOffer.id, idNba, idEstado).subscribe((r: GenericResponse) => {
this.getNBAs();
})
);
}

// setNBAPegaMaybe(nba: any) {
// this.loaders.estadoNbaPega = true;
// this.customersService.setRespuestaNBAPega(this.customersService.cliente.id, this.customersService.cliente.direccionOffer.id, nba.id, "maybe")
// .subscribe((r: GenericResponse) => {
// this.loaders.estadoNbaPega = false;
// this.toastr.info('Respuesta enviada correctamente.', 'Info', { progressBar: true, });
// });
// }

setNBAPegaMaybe(nba: any) {
console.log('nba.Group :>> ', nba.Group);
// console.log('this.cliente.direccionOffer :>> ', this.cliente.direccionOffer);
if (this.cliente.direccionOffer.superOferta != 'ON19') {
this.toastr.error('RetailX por el momento soporta operaciones de ON19, las activaciones de ON15 o inferiores deberán realizarse por SMART...', 'Ooops!', { progressBar: true, });
}
else if (!this.cliente.rgpd) {
// Sin RGPD aceptada
this.toastr.info('Debe aceptar la RGPD para poder continuar.', 'Ooops!', { progressBar: true, });
}
else {
this.saveLogPega(nba, 'M');
}
// else if (_hardCoded.NBA_GRUPOS_HI.includes(nba.Group)) {
// // this.saveLogPega(nba, 'M');
// this.subscriptions.add(
// this.customersService.saveLogPega(this.cliente.id, this.cliente.direccionOffer.id, nba.id, 'M').subscribe(() => {
// this.router.navigate(['/configurador/conf-fide-one-plus'], { queryParams: { nbaPega: nba.id, actionPega: 'M' } });
// })
// );
// }
// else {
// // this.saveLogPega(nba, 'M');
// this.subscriptions.add(
// this.customersService.saveLogPega(this.cliente.id, this.cliente.direccionOffer.id, nba.id, 'M').subscribe(() => {
// this.router.navigate(['/configurador/conf-fide'], { queryParams: { nbaPega: nba.id, actionPega: 'M' } });
// })
// );
// }
}

setNBAPegaReject(nba: any) {
const modalRef = this.modalService.open(ModalNbaPegaRechazoComponent);
modalRef.componentInstance.idNba = nba.id;
modalRef.componentInstance.motivosRechazo = nba.ListaMotivosRechazo;

modalRef.result.then(
async (result) => {
if (result) {
const motivoRechazo = result;
console.log('result :>> ', result);
this.loaders.estadoNbaPega = true;
this.subscriptions.add(
this.customersService.setRespuestaNBAPega(this.customersService.cliente.id, this.customersService.cliente.direccionOffer.id, nba.id, 'reject', motivoRechazo)
.subscribe((r: GenericResponse) => {
this.loaders.estadoNbaPega = false;
this.toastr.info('Respuesta enviada correctamente. Se va a proceder a consultar las NBAs de nuevo.', 'Info', { progressBar: true, });
this.getNbasPega();
})
);
}
},
(reason) => { }
);
}

setNbaPegaAccept(nba: any) {

console.log('this.cliente.direccionOffer :>> ', this.cliente.direccionOffer);

if (this.cliente.direccionOffer.superOferta != 'ON19') {
this.toastr.error('RetailX por el momento soporta operaciones de ON19, las activaciones de ON15 o inferiores deberán realizarse por SMART...', 'Ooops!', { progressBar: true, });
}
else if (!this.cliente.rgpd) {
// Sin RGPD aceptada
this.toastr.info('Debe aceptar la RGPD para poder continuar.', 'Ooops!', { progressBar: true, });
}
else {
this.saveLogPega(nba, 'A');
}
// else if (_hardCoded.NBA_GRUPOS_HI.includes(nba.Group)) {
// // this.saveLogPega(nba, 'A');
// this.subscriptions.add(
// this.customersService.saveLogPega(this.cliente.id, this.cliente.direccionOffer.id, nba.id, 'A').subscribe(() => {
// this.router.navigate(['/configurador/conf-fide-one-plus'], { queryParams: { nbaPega: nba.id, actionPega: 'C' } });
// })
// );
// }
// else {
// // this.saveLogPega(nba, 'A');
// this.subscriptions.add(
// this.customersService.saveLogPega(this.cliente.id, this.cliente.direccionOffer.id, nba.id, 'A').subscribe(() => {
// this.router.navigate(['/configurador/conf-fide'], { queryParams: { nbaPega: nba.id, actionPega: 'C' } });
// })
// );
// }
}

saveLogPega(nba, respuesta) {
if (respuesta !== 'V' || (respuesta === 'V' && nba.visible)) {
this.subscriptions.add(
this.customersService.saveLogPega(this.cliente.id, this.cliente.direccionOffer.id, nba.id, respuesta).subscribe(() => {
if (["A", "M"].includes(respuesta)) { // Si es Acepta o Maybe, se redirecciona a conf-fide o conf-fide-one-plus
const actionPega = respuesta == "A" ? "C" : "M"; // Convierte respuesta a actionPega
if (_hardCoded.NBA_GRUPOS_HI.includes(nba.Group)) {
this.router.navigate(['/configurador/conf-fide-one-plus'], { queryParams: { nbaPega: nba.id, actionPega: actionPega } });
}
else {
this.router.navigate(['/configurador/conf-fide'], { queryParams: { nbaPega: nba.id, actionPega: actionPega } });
}
}
})
);
}
}

isLoadingImportant() {
if (this.isFide && (this.loadingCatalogoFide || this.loadingRenovavilidad || this.loadingNBAs)) {
return true;
}
else if (!this.isFide && this.loadingServicialidad) {
return true;
}

return false;
}

setClienteRGPD() {
if (this.form.controls.rgpd.value) {
this.subscriptions.add(
this.customersService
.setClienteRGPD(this.customersService.cliente.id, this.form.controls.rgpd.value, this.form.controls.rgpdLocalizacion.value, this.form.controls.rgpdFacturacion.value,
this.form.controls.rgpdOfertas.value, this.form.controls.rgpdNoOfertas.value, this.form.controls.rgpdNoOtrasEntidades.value)
.subscribe((r: GenericResponse) => { })
);
this.cliente.rgpd = true;
this.form.controls.rgpdLocalizacion.value ? this.form.controls.rgpdLocalizacion.disable() : undefined;
this.form.controls.rgpdFacturacion.value ? this.form.controls.rgpdFacturacion.disable() : undefined;
this.form.controls.rgpdOfertas.value ? this.form.controls.rgpdOfertas.disable() : undefined;
this.form.controls.rgpdNoOfertas.value ? this.form.controls.rgpdNoOfertas.disable() : undefined;
this.form.controls.rgpdNoOtrasEntidades.value ? this.form.controls.rgpdNoOtrasEntidades.disable() : undefined;
this.form.controls.rgpd.disable();
this.rgpdDirty = false;
}
}

editarCliente() {
this.editingCliente = true;
}

responseEditarCliente(event) {
this.form.controls.nombre.setValue(this.customersService.cliente.nombre);
this.form.controls.apellidos.setValue(
this.customersService.cliente.apellidos
);
this.form.controls.razonSocial.setValue(
this.customersService.cliente.razonSocial
);
this.form.controls.email.setValue(this.customersService.cliente.email);
this.form.controls.segmentoVf.setValue(
this.customersService.cliente.segmentoVf
);
this.form.controls.telefonoMovil.setValue(
this.customersService.cliente.telefonoMovil
);
this.form.controls.telefonoFijo.setValue(
this.customersService.cliente.telefonoFijo
);
this.form.controls.telefonoAlt.setValue(
this.customersService.cliente.telefonoAlt
);
this.form.controls.noTieneMovil.setValue(
this.customersService.cliente.noTieneMovil
);
this.editingCliente = false;
}

aceptaNba(nba: any) {
if (this.cliente.direccionOffer.superOferta != 'ON19') {
// No permitido operaciones ON15 desde RetailX
this.toastr.error('RetailX por el momento soporta operaciones de ON19, las activaciones de ON15 o inferiores deberán realizarse por SMART...', 'Ooops!', { progressBar: true });
} else if (nba.descr.toLowerCase().includes('hogar ilimitable')) {
// NBA de Hogar Ilimitable
this.router.navigate(['/configurador/conf-fide-one-plus'], { queryParams: { nba: nba.id }, });
} else {
this.router.navigate(['/configurador/conf-fide'], { queryParams: { nba: nba.id }, });
}
}

getDesgloseCuotas() {
this.loaders.desgloseCuotas = true;
this.subscriptions.add(
this.customersService.getDesgloseCuotas(this.cliente.direccionOffer.idCliente, this.cliente.direccionOffer.id)
.subscribe((r: GenericResponse) => {
this.desgloseCuotas = r.data;
this.loaders.desgloseCuotas = false;
})
);
}

getCustomerOfferHistoryPega() {
this.loaders.historicoOfertasPega = true;
this.subscriptions.add(
this.customersService.getCustomerOfferHistoryPega(this.cliente.direccionOffer.idCliente, this.cliente.direccionOffer.id)
.subscribe((r: GenericResponse) => {
console.log('getCustomerOfferHistoryPega', r.data);

this.historicoOferta = r.data.data.map((offer: any) => {
return {
Channel: offer.Parts.LineItems.LineItem.Channel,
Direction: offer.Parts.LineItems.LineItem.Direction,
ExternalID: offer.Parts.LineItems.LineItem.ExternalID,
GrupoDeTrabajo: offer.Parts.LineItems.LineItem.GrupoDeTrabajo,
Issue: offer.Parts.LineItems.LineItem.Issue,
Label: offer.Parts.LineItems.LineItem.Label,
Login: offer.Parts.LineItems.LineItem.Login,
MotivoRechazo: offer.Parts.LineItems.LineItem.MotivoRechazo,
Name: offer.Parts.LineItems.LineItem.Name,
Outcome: offer.Parts.LineItems.LineItem.Outcome,
ColorNBA: offer.Parts.LineItems.LineItem.ColorNBA,
OutcomeDate: offer.Parts.LineItems.LineItem.OutcomeDate,
OutcomeTime: offer.Parts.LineItems.LineItem.OutcomeTime,
OfferVFDescriptor: offer.Parts.LineItems.LineItem.OfferVFDescriptor
};
});

this.loaders.historicoOfertasPega = false;
})
);
}

/**
* Submits the form
*/
public submitCuestionarioForm(): void {
if (this.cuestionarioNBAForm.valid) {
// // this.saveLogPega(0, 'C');
// this.subscriptions.add(
// this.customersService.saveLogPega(this.cliente.id, this.cliente.direccionOffer.id, nba.id, 'M').subscribe(() => {
// this.router.navigate(['/configurador/conf-fide-one-plus'], { queryParams: { nbaPega: nba.id, actionPega: 'M' } });
// })
// );
this.getNbasPega();
}
}

async getHaveInteraccionesPega() {
return new Promise<boolean>((resolve, reject) => {

// this.subscriptions.add(
this.customersService.haveInteraccionPega(this.customersService.cliente.id, this.customersService.cliente.direccionOffer.id).subscribe((result: GenericResponse) => {
resolve(result.data);
})
// );
});
}

ngOnDestroy(): void {
this.subscriptions.unsubscribe();
}
}