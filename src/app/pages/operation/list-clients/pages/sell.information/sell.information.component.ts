import {Component, inject, Input, OnInit} from '@angular/core';
import {FormArray, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators} from "@angular/forms";
import {ActivatedRoute, Router, RouterLink} from "@angular/router";
import {DialogService} from "primeng/dynamicdialog";
import {ClientService} from "../../../../../services/client-managament/client.service";
import {CountryCodeService} from "../../../../../services/country-code.service";
import {MessageService} from "primeng/api";
import {Client} from "../../../../../models/client.model";
import {CommonModule} from "@angular/common";
import {SelectModule} from "primeng/select";
import {InputTextModule} from "primeng/inputtext";
import {TableModule} from "primeng/table";
import {SuccessModalComponent} from "../../../../../components/modals/success-modal/success-modal.component";

@Component({
  selector: 'app-sell.information',
  imports: [ReactiveFormsModule, TableModule,CommonModule, FormsModule, SelectModule, InputTextModule],
  templateUrl: './sell.information.component.html',
  styleUrl: './sell.information.component.css',
  providers: [DialogService, MessageService]
})
export class SellInformationComponent implements OnInit{

  sellForm!: FormGroup;
  private formBuilder = inject(FormBuilder);
  allSells: any[] = [];
  isLoading: boolean = false;


  sell: any = null;
  spend: any[] = [];
  payments: any[] = [];

  idSellRoute: string | null=''

  productMap = new Map<number, string>();
  editable:  boolean = false ;
  spendForm!: FormGroup;
  originalRowData: any = null;
  editingGastoRowIndex: number | null = null;
  editingPagoRowIndex: number | null = null;

  editGastoRow(rowIndex: number): void {
    this.editingGastoRowIndex = rowIndex;
  }

  cancelEditGastoRow(): void {
    this.editingGastoRowIndex = null;
  }
  editPagoRow(rowIndex: number): void {
    this.editingPagoRowIndex = rowIndex;
  }

  cancelEditPagoRow(): void {
    this.editingPagoRowIndex = null;
  }
  get gastosArray(): FormArray {
    return this.sellForm.get('gastos') as FormArray;
  }
  get pagosArray(): FormArray {
    return this.sellForm.get('pagos') as FormArray;
  }
  ngOnInit(): void {

    this.sellForm = this.formBuilder.group({
      ventaId: [''],
      fecha: [''],
      cliente: ['', [Validators.required, Validators.maxLength(100)]],
      estado: ['', Validators.required],
      producto: [''],
      cantidad: ['', Validators.required],
      precioVentaUnit: [0, Validators.required],
      gastos: this.formBuilder.array([]),
      pagos: this.formBuilder.array([])
    });

    // this.spendForm = this.formBuilder2.group({
    //   fecha: [''],
    //   tipo: ['', [Validators.required, Validators.maxLength(100)]],
    //   monto: [0, Validators.required],
    // });

    this.idSellRoute = this.route.snapshot.paramMap.get('id'); // string
    console.log('ventaId', this.idSellRoute);
    this.loadProductos();
    this.loadSell();


  }




  constructor(
    private router: Router,
    private route: ActivatedRoute,
    public dialogService: DialogService,
    private clientService: ClientService,
    private countryCodeService: CountryCodeService,
    private messageService: MessageService,

  ) {}

  loadSell() {
    this.isLoading = true;

      if (!this.idSellRoute) return;

      this.clientService.getSellById(this.idSellRoute).subscribe({
        next: (response) => {
          const v = response.data.venta;
          this.sell = response.data.venta;
          this.spend = response.data.gastos;
          this.payments=response.data.pagos;


          if (!v) return;

          const d = new Date(v.fecha);
          this.sell = {
            ...v,
            fechaObj: d,
            fechaFmt: this.formatYMD(d)
          };

          // ✅ aquí llenas el form
          this.sellForm.patchValue({
            ventaId: this.sell.ventaId,
            fecha: this.sell.fechaFmt,
            cliente: this.sell.cliente,
            estado: this.sell.estado,

            cantidad: this.sell.cantidad,
            precioVentaUnit: this.sell.precioVentaUnit
          });

          this.gastosArray.clear();
          this.spend.forEach((g: any) => {


            this.gastosArray.push(this.createGastoForm(g));
          });
          this.pagosArray.clear();



          this.payments.forEach((g: any) => {
            const d = new Date(g.fecha);
            g = {
              ...g,
              fechaObj: d,
              fechaFmt: this.formatYMD(d)
            };

            console.log(g);

            this.pagosArray.push(this.createPagosForm(g));
          });

          console.log(this.spend);
          this.patchProductoNombre();

          this.isLoading = false;
        },
        error: (error) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: error.message || 'No se pudo cargar la venta'
          });
        }
      });



  }

  loadProductos() {
    this.clientService.getProductos().subscribe({
      next: (res) => {
        (res.data || []).forEach((p: any) => {
          this.productMap.set(Number(p.productoId), String(p.nombre));
        });

        // si ya cargaste la venta, actualiza el campo producto
        this.patchProductoNombre();
      }
    });
  }

  private patchProductoNombre() {
    console.log(this.sell);
    if (!this.sell) return;
    const nombre = this.productMap.get(Number(this.sell.productoId)) ?? `ID ${this.sell.productoId}`;
    this.sellForm.patchValue({ producto: nombre });
  }


  private formatYMD(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  normalizeClass(): string {

    const value = this.sellForm?.get('estado')?.value; // ✅
    if (!value) return '';

    return String(value)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');
  }

  return() {
    this.router.navigate(["main/operation/list-sell"]);
  }

  originalVentaData: any = null;

  editStatus(): void {
    if (!this.editable) {
      this.originalVentaData = this.sellForm.getRawValue();
      this.editable = true;
    } else {
      if (this.originalVentaData) {
        this.sellForm.patchValue(this.originalVentaData);
      }
      this.editable = false;
    }
  }
  createGastoForm(gasto?: any): FormGroup {

    return this.formBuilder.group({
      gastoId: [gasto?.gastoId || ''],
      by: [gasto?.asumidoPor || ''],
      tipo: [gasto?.tipo || '', [Validators.required, Validators.maxLength(100)]],
      monto: [gasto?.monto || 0, Validators.required]
    });
  }

  createPagosForm(pago?: any): FormGroup {


    return this.formBuilder.group({
      pagoId: [pago?.pagoId || ''],
      fecha: [pago?.fechaFmt || ''],
      metodo: [pago?.metodo || ''],
      monto: [pago?.monto || 0, Validators.required]
    });
  }
  removeGasto(index: number) {
    this.gastosArray.removeAt(index);
  }
  addGasto(gasto?: any) {
    this.gastosArray.push(this.createGastoForm(gasto));
  }

  saveGastoRow(rowIndex: number): void {
    const row = this.gastosArray.at(rowIndex);

    if (row.invalid) {
      row.markAllAsTouched();
      return;
    }

    const payload = {
      gastoId: row.get('gastoId')?.value,
      monto: Number(row.get('monto')?.value),
      tipo: row.get('tipo')?.value,
      by: row.get('by')?.value
    };

    this.clientService.updateGasto(payload).subscribe({
      next: (response) => {
        this.openSuccessModal('gasto')
        if (response?.ok) {
          this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail: 'Gasto actualizado correctamente'
          });

          this.editingGastoRowIndex = null;
        } else {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: response?.error || 'No se pudo actualizar el gasto'
          });
        }
      },
      error: (error) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: error?.message || 'Ocurrió un error al actualizar el gasto'
        });
      }
    });
  }

  saveVenta(): void {

    if (this.sellForm.invalid) {
      this.sellForm.markAllAsTouched();
      return;
    }

    const payload = {
      ventaId: this.sellForm.get('ventaId')?.value,
      cantidad: Number(this.sellForm.get('cantidad')?.value),
      precioVentaUnit: Number(this.sellForm.get('precioVentaUnit')?.value)
    };

    this.clientService.updateVenta(payload).subscribe({
      next: (response) => {
        this.openSuccessModal('detalle de venta')
        if (response?.ok) {
          this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail: 'Gasto actualizado correctamente'
          });

          this.editable=false;
        } else {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: response?.error || 'No se pudo actualizar el gasto'
          });
        }
      },
      error: (error) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: error?.message || 'Ocurrió un error al actualizar el gasto'
        });
      }
    });
  }


  savePagoRow(rowIndex: number): void {
    const row = this.pagosArray.at(rowIndex);

    if (row.invalid) {
      row.markAllAsTouched();
      return;
    }

    const payload = {
      pagoId: row.get('pagoId')?.value,
      monto: Number(row.get('monto')?.value),
      fecha: row.get('fecha')?.value,
      metodo: row.get('metodo')?.value
    };

    this.clientService.updatePago(payload).subscribe({
      next: (response) => {
        if (response?.ok) {

          this.openSuccessModal('pago')
          this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail: 'Pago actualizado correctamente'
          });

          this.editingPagoRowIndex = null;
        } else {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: response?.error || 'No se pudo actualizar el pago'
          });
        }
      },
      error: (error) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: error?.message || 'Ocurrió un error al actualizar el pago'
        });
      }
    });
  }

  openSuccessModal(str:string) {
    this.dialogService.open(SuccessModalComponent, {
      data: {
        message: [
          `El ${str} ha sido editado exitosamente`
        ] },
      width: '400px',
    });

  }

}
