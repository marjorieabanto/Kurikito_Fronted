import { Component, OnInit } from '@angular/core';
import { DialogService, DynamicDialogRef } from "primeng/dynamicdialog";
import { ActivatedRoute, Router } from "@angular/router";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { SelectModule } from "primeng/select";
import { DatePickerModule } from "primeng/datepicker";
import { InputTextModule } from "primeng/inputtext";
import { ButtonModule } from "primeng/button";
import { TableComponent } from "../../../components/table/table.component";
import { ClientModalComponent } from "../modals/client-modal/client-modal.component";
import { ConfirmModalComponent } from "../../../components/modals/confirm-modal/confirm-modal.component";
import { ClientService } from "../../../services/client-managament/client.service";
import { CountryCodeService } from "../../../services/country-code.service";
import { Client } from "../../../models/client.model";
import { MessageService } from "primeng/api";
import { ToastModule } from "primeng/toast";
import {ToggleSwitchModule} from "primeng/toggleswitch";

@Component({
  selector: 'app-list-clients',
  imports: [
    CommonModule,
    FormsModule,
    SelectModule,
    DatePickerModule,
    InputTextModule,
    ButtonModule,
    TableComponent,
    ToastModule,
    ToggleSwitchModule
  ],
  templateUrl: './list-clients.component.html',
  styleUrl: './list-clients.component.css',
  providers: [DialogService, MessageService]
})
export class ListClientsComponent implements OnInit {
  searchText: string = '';
  dateRange: Date[] | undefined;
  isLoading: boolean = false;
  allClients: Client[] = [];
  filterTimeout: any;

  // Estos son los datos filtrados que envías al app-table
  data: Client[] = [];

  status: boolean = true;

  actions = [
    { icon: 'eye_tracking', action: (row: any) => this.onEdit(row) },
    { icon: 'edit_square', action: (row: any) => this.onDelete(row) },
  ];

  columns = [
    { field: 'id', header: 'Id' },
    { field: 'fecha', header: 'Fecha de registro' },
    { field: 'cliente', header: 'Nombre' },
    { field: 'productoId', header: 'Producto' },

    { field: 'cantidad', header: 'cantidad' },
    { field: 'precioVentaUnit', header: 'P. Venta' },
    {
      field: 'estado',
      header: 'Estado',
      type: 'tag',
      colorMap: { Activo: 'green', Inactivo: 'red', Pendiente: 'orange' },
    },
    {
      field: 'actions',
      header: 'Opciones',
      type: 'actions',
      actions: this.actions,
    },
  ];

  ref: DynamicDialogRef | undefined;
  services: any[] = [
    'Telefonia', 'Internet', 'TV'
  ];

  serviceSelected: any = null;


  constructor(
    private router: Router,
    public dialogService: DialogService,
    private route: ActivatedRoute,
    private clientService: ClientService,
    private countryCodeService: CountryCodeService,
    private messageService: MessageService
  ) {}

  ngOnInit() {
    this.loadClients();
  }

  loadClients() {
    this.isLoading = true;
    this.clientService.getAllClients().subscribe({
      next: (response) => {

        console.log("respuesta:"+ response);

          this.data = response.data;

        console.log(this.data)
        console.log('ventas cargados:', this.data.length, this.data);

        // Aplicar filtros iniciales (por defecto solo activos)
       //this.executeFilters();

        this.isLoading = false;
      },
      error: (error) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: error.message || 'No se pudieron cargar los clientes'
        });
        this.isLoading = false;
      }
    });
  }

  formatPhoneForDisplay(phone: string): string {
    if (!phone) return phone;

    // Parsear el número desde la base de datos
    const phoneData = this.countryCodeService.parsePhoneFromDatabase(phone);

    if (phoneData.country && phoneData.phoneNumber) {
      return this.countryCodeService.formatForDisplay(phoneData.phoneNumber, phoneData.country);
    }

    return phone; // Fallback al número original si no se puede parsear
  }

  applyFilters() {
    // Limpiar timeout anterior si existe
    if (this.filterTimeout) {
      clearTimeout(this.filterTimeout);
    }

    // Debounce para búsqueda de texto
    this.filterTimeout = setTimeout(() => {
      this.executeFilters();
    }, 300);
  }

  executeFilters() {
    this.isLoading = true;
    let filtered = [...this.allClients];

    // Debug inicial: mostrar todos los clientes y sus fechas
    console.log('=== DEBUG CLIENTES ===');
    console.log('Total clientes:', this.allClients.length);
    if (this.allClients.length > 0) {
      this.allClients.slice(0, 3).forEach((client, index) => {
        console.log(`Cliente ${index + 1}:`, {
          nombre: client.userFirstName,
          fechaCreacion: client.created,
          fechaParsed: new Date(client.created),
          activo: client.active,
          typeof: typeof client.created
        });
      });
    }

    // Aplicar filtro de texto localmente si hay búsqueda (solo nombres y apellidos)
    if (this.searchText && this.searchText.trim() !== '') {
      const search = this.searchText.toLowerCase().trim();
      filtered = filtered.filter(item => {
        const firstName = (item.userFirstName || '').toLowerCase();
        const lastName = (item.userLastName || '').toLowerCase();

        return firstName.includes(search) || lastName.includes(search);
      });
    }

    // Aplicar filtro de estado
    if (this.status !== null && this.status !== undefined) {
      filtered = filtered.filter(item => item.active === this.status);
    }

    // Aplicar filtro de fecha basado en cómo se ve en el frontend
    if (this.dateRange && this.dateRange.length >= 1 && this.dateRange[0]) {
      const start = this.dateRange[0];
      const end = this.dateRange[1] || start;

      // Convertir las fechas del filtro a string en formato local (como se ve en frontend)
      const startDateString = start.toLocaleDateString('es-ES');
      const endDateString = end.toLocaleDateString('es-ES');

      console.log('Filtro por fecha visual:', {
        inicioFiltro: startDateString,
        finFiltro: endDateString
      });

      filtered = filtered.filter(item => {
        if (!item.created) return false;

        // Convertir la fecha del cliente evitando problemas de zona horaria
        let clientDateString: string;

        if (item.created.includes('-')) {
          // Si viene en formato YYYY-MM-DD, parsearlo directamente
          const [year, month, day] = item.created.split('-');
          clientDateString = `${parseInt(day)}/${parseInt(month)}/${year}`;
        } else {
          // Fallback al método original
          const createdDate = new Date(item.created);
          if (isNaN(createdDate.getTime())) return false;
          clientDateString = createdDate.toLocaleDateString('es-ES');
        }

        // Comparar las fechas como strings (como se ven visualmente)
        const cumpleFiltro = this.isDateInRange(clientDateString, startDateString, endDateString);

        console.log('Cliente:', item.userFirstName, {
          fechaOriginal: item.created,
          fechaVisual: clientDateString,
          cumpleFiltro: cumpleFiltro
        });

        return cumpleFiltro;
      });
    }

    // Formatear números de teléfono para los datos filtrados
    this.data = filtered.map((client: Client) => ({
      ...client,
      formattedPhone: this.formatPhoneForDisplay(client.userPhone)
    }));

    console.log('Filtros aplicados:', {
      searchText: this.searchText,
      status: this.status,
      dateRange: this.dateRange,
      totalClients: this.allClients.length,
      filteredClients: this.data.length,
      clientesOriginalCount: this.allClients.length,
      clientesFiltradosCount: filtered.length,
      primerosClientes: this.allClients.slice(0, 3).map(c => ({
        nombre: c.userFirstName,
        fechaCreacion: c.created,
        activo: c.active
      }))
    });

    // Debug específico para fechas
    if (this.dateRange && this.dateRange.length >= 1 && this.dateRange[0]) {
      const start = this.dateRange[0];
      const end = this.dateRange[1] || start;

      console.log('Filtro de fecha:', {
        fechaInicio: start,
        fechaFin: end,
        esMismoDia: start.toDateString() === end.toDateString(),
        soloUnaFecha: !this.dateRange[1]
      });
    }

    this.isLoading = false;
  }

  // Método para filtros inmediatos (sin debounce)
  applyFiltersImmediate() {
    if (this.filterTimeout) {
      clearTimeout(this.filterTimeout);
    }
    this.executeFilters();
  }

  // Debug temporal
  onSearchDebug() {
    console.log('Texto de búsqueda:', this.searchText);
  }


  clearFilters() {
    this.searchText = '';
    this.dateRange = undefined;
    this.status = true; // Por defecto activos
    this.serviceSelected = null;
    this.applyFiltersImmediate();
  }


  create() {
    const ref = this.dialogService.open(ClientModalComponent, {
      data: {
        mode: 'Crear'
      },
      header: 'Crear nuevo cliente',
      width: '500px',
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
        this.loadClients();
      }
    });
  }

  onEdit(row: any) {
    const ref = this.dialogService.open(ClientModalComponent, {
      data: {
        mode: 'Editar',
        client: row
      },
      header: 'Editar cliente',
      width: '500px',
      modal: true,
      dismissableMask: true,
    });

    ref.onClose.subscribe(result => {
      if (result && result.success) {
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: 'Cliente actualizado correctamente'
        });
        this.loadClients();
      }
    });
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
        this.clientService.deleteClient(row.id).subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Éxito',
              detail: 'Cliente desactivado correctamente'
            });
            this.loadClients();
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
