import {Component, inject, OnInit, signal} from '@angular/core';
import { DialogService, DynamicDialogRef } from "primeng/dynamicdialog";
import { ActivatedRoute, Router } from "@angular/router";
import { CommonModule } from "@angular/common";
import {FormBuilder, FormGroup, FormsModule, ReactiveFormsModule} from "@angular/forms";
import { SelectModule } from "primeng/select";
import { DatePickerModule } from "primeng/datepicker";
import { InputTextModule } from "primeng/inputtext";
import { ButtonModule } from "primeng/button";
import { TableComponent } from "../../../../components/table/table.component";
import { ClientModalComponent } from "../../modals/client-modal/client-modal.component";
import { ConfirmModalComponent } from "../../../../components/modals/confirm-modal/confirm-modal.component";
import { SellService } from "../../../../services/sell.service";
import { CountryCodeService } from "../../../../services/country-code.service";
import { Client } from "../../../../models/client.model";
import {LazyLoadMeta, MessageService} from "primeng/api";
import { ToastModule } from "primeng/toast";
import {ToggleSwitchModule} from "primeng/toggleswitch";

@Component({
  selector: 'app-sellList',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    SelectModule,
    DatePickerModule,
    InputTextModule,
    ButtonModule,
    TableComponent,
    ToastModule,
    ToggleSwitchModule
  ],
  templateUrl: './sellList.component.html',
  styleUrl: './sellList.component.css',
  providers: [DialogService, MessageService]
})
export class SellListComponent implements OnInit {

  private formBuilder = inject(FormBuilder);

searchText:String= '';
  dateRange: Date[] | undefined;
  isLoading: boolean = false;
  allSells: Client[] = [];
  filterTimeout: any;


  data: any[] = [];

  status: boolean = true;

  actions = [
    { icon: 'eye_tracking', action: (row: any) => this.onEdit(row) },
    //{ icon: 'edit_square', action: (row: any) => this.onDelete(row) },
  ];

  columns = [
    { field: 'ventaId', header: 'Id' },
    { field: 'fechaFmt', header: 'Fecha de registro' },
    { field: 'cliente', header: 'Nombre' },
    { field: 'productoNombre', header: 'Producto' },

    { field: 'cantidad', header: 'cantidad' },
    { field: 'precioVentaUnit', header: 'P. Venta' },
    {
      field: 'estado',
      header: 'Estado',
      type: 'tag',
      colorMap: { Activo: 'green', Cancelado: 'red', Pendiente: 'orange' },
    },
    {
      field: 'actions',
      header: 'Opciones',
      type: 'actions',
      actions: this.actions,
    },
  ];

  ref: DynamicDialogRef | undefined;
  states = [
    { label: 'Todos', value: '' },
    { label: 'Activa', value: 'ACTIVA' },
    { label: 'Cancelada', value: 'CANCELADA' },
  ];


  formGlobalFilter: FormGroup = this.buildFormGlobalFilter();

  productMap = new Map<number, string>();



  constructor(
    private router: Router,
    public dialogService: DialogService,
    private route: ActivatedRoute,
    private sellService: SellService,
    private countryCodeService: CountryCodeService,
    private messageService: MessageService
  ) {}

  ngOnInit() {
    this.loadProductosAndVentas();
  }

  private buildFormGlobalFilter(): FormGroup {
    return this.formBuilder.group({
      searchText: [''],
      dateRange: [null],   // range: [Date, Date]
      status: ['']         // '' | 'ACTIVA' | 'CANCELADA'
    });
  }

  loadSells() {
    this.isLoading = true;
    this.sellService.getAllSells().subscribe({
      next: (response) => {
        this.allSells = (response.data || []).map((v: any) => ({
          ...v,
          productoNombre: this.productMap.get(Number(v.productoId)) ?? `ID ${v.productoId}`,
          fechaFmt: this.formatYMD(new Date(v.fecha))
        }));

        this.data = [...this.allSells];



        this.isLoading = false;
      },
      error: (error) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: error.message || 'No se pudieron cargar las ventas'
        });
        this.isLoading = false;
      }
    });
  }


  loadProductosAndVentas() {
    this.isLoading = true;

    this.sellService.getSellsWithProducts().subscribe({
      next: (response) => {
        const productos = response.data?.productos || [];
        const ventas = response.data?.ventas || [];

        productos.forEach((p: any) => {
          this.productMap.set(Number(p.productoId), String(p.nombre));
        });

        this.allSells = ventas.map((v: any) => ({
          ...v,
          productoNombre: this.productMap.get(Number(v.productoId)) ?? `ID ${v.productoId}`,
          fechaFmt: this.formatYMD(new Date(v.fecha))
        }));
        this.data = [...this.allSells];
        this.isLoading = false;
      },
      error: (error) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: error.message || 'No se pudieron cargar las ventas'
        });
        this.isLoading = false;
      }
    });
  }


  private formatYMD(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }


  executeFilters() {
    this.isLoading = true;

      const searchText = String(this.formGlobalFilter.value.searchText || '').trim().toLowerCase();
      const status = String(this.formGlobalFilter.value.status || '').trim().toUpperCase();
      const dateRange = this.formGlobalFilter.value.dateRange as Date[] | null;

      const start = dateRange?.[0] ? this.startOfDay(dateRange[0]) : null;
      const end = dateRange?.[1] ? this.endOfDay(dateRange[1]) : null;

      this.data = this.allSells.filter((v: any) => {
        const matchText = !searchText || String(v.cliente || '').toLowerCase().includes(searchText);
        const matchStatus = !status || String(v.estado || '').toUpperCase() === status;

        const vDate: Date | null = v.fechaObj ?? new Date(v.fecha);
        const matchDate =
          (!start && !end) ||
          (vDate && start && end && vDate >= start && vDate <= end) ||
          (vDate && start && !end && vDate >= start) ||
          (vDate && !start && end && vDate <= end);

        return matchText && matchStatus && matchDate;
      });

    this.isLoading = false;
    }

  private startOfDay(d: Date): Date {
      const x = new Date(d);
      x.setHours(0, 0, 0, 0);
      return x;
    }

  private endOfDay(d: Date): Date {
      const x = new Date(d);
      x.setHours(23, 59, 59, 999);
      return x;
    }


  applyFiltersImmediate() {
    if (this.filterTimeout) {
      clearTimeout(this.filterTimeout);
    }
    this.executeFilters();
  }



  clearFilters() {
    this.formGlobalFilter.reset({
      searchText: '',
      dateRange: null,
      status: ''
    });
    this.data = [...this.allSells];
  }

  create() {
    const ref = this.dialogService.open(ClientModalComponent, {
      data: {
        mode: 'Crear'
      },
      header: 'Crear nuevo cliente',
      width: '500px',
      height:'99vh',
      modal: true,
      dismissableMask: true,
    });

    ref.onClose.subscribe(result => {
      if (result && result.success) {
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: 'Cliente creado correctamente'
        });
        this.loadSells();
      }
    });
  }

  onEdit(row: any) {
    this.router.navigate(['/main/operation/list-sell', row.ventaId]);
  }
  onDelete(row: any) {
    const ref = this.dialogService.open(ConfirmModalComponent, {
      data: {
        detailsCupo: {
          title: "¿Está seguro de eliminar a:",
          start: row.userFirstName + " " + row.userLastName,
        },
      },
      width: '400px',
      modal: true,
      dismissableMask: false,
    });

    ref.onClose.subscribe((confirmed) => {
      if (confirmed) {
        this.sellService.deleteSell(row.id).subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Éxito',
              detail: 'Cliente desactivado correctamente'
            });
            this.loadSells();
          },
          error: (error) => {
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: error.message || 'No se pudo desactivar el cliente'
            });
          }
        });
      }
    });
  }


  viewHistory(row: any) {
    this.router.navigate(['/operation/client-history', row.id]);
  }

  // Método para comparar fechas basado en cómo se ven en el frontend
  private isDateInRange(clientDateString: string, startDateString: string, endDateString: string): boolean {
    console.log('isDateInRange:', {
      cliente: clientDateString,
      inicio: startDateString,
      fin: endDateString
    });

    // Convertir strings de fecha "dd/mm/yyyy" a objetos Date para comparación
    const parseSpanishDate = (dateStr: string): Date => {
      const [day, month, year] = dateStr.split('/').map(Number);
      return new Date(year, month - 1, day); // month - 1 porque Date usa meses base 0
    };

    const clientDate = parseSpanishDate(clientDateString);
    const startDate = parseSpanishDate(startDateString);
    const endDate = parseSpanishDate(endDateString);

    const result = clientDate >= startDate && clientDate <= endDate;

    console.log('Comparación de fechas:', {
      clienteParsed: clientDate,
      inicioParsed: startDate,
      finParsed: endDate,
      resultado: result
    });

    return result;
  }

}
