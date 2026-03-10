import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges } from '@angular/core';
import { TableModule } from 'primeng/table';
import { CheckboxModule } from 'primeng/checkbox';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { PaginatorModule } from 'primeng/paginator';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';

@Component({
  selector: 'app-table',
  standalone: true,
  imports: [
    TableModule,
    CheckboxModule,
    FormsModule,
    ReactiveFormsModule,
    CommonModule,
    PaginatorModule,
    ButtonModule,
    TooltipModule,
  ],
  templateUrl: './table.component.html',
  styleUrls: ['./table.component.scss'],
})
export class TableComponent<T> implements OnChanges {
  @Input() columns: { field: string; title?:string; header: string; type?: string; colorMap?: any; value?: any , tooltipText?: any, actions? : any[], icon?:any }[] = [];
  @Input() data: T[] = [];
  @Input() showPaginator: boolean = true;
  @Input() actions: { icon: string, action: (row: any) => void }[] = [];
  @Input() totalRecords: number = 0;
  @Input() transparentHeader: boolean = false;
  paginatedData: any[] = [];
  rowsPerPage = 5; // Filas por página
  currentPage = 0;
  @Input() sortOrder: number = 1;

  @Output() lazyLoad = new EventEmitter<any>();
  @Output() checkboxChange = new EventEmitter<{ row: any, checked: boolean }>();

  ngOnInit() {
    // Inicializar la paginación
    this.updatePagination();
  }

  ngOnChanges(changes: SimpleChanges) {
    // Si cambia el conjunto de datos, actualizar la paginación
    if (changes['data']) {
      this.updatePagination();

      // Si no se proporciona totalRecords, usar la longitud de los datos
      if (!this.totalRecords) {
        this.totalRecords = this.data.length;
      }
    }
  }

  private updatePagination() {
    // Si no hay datos, no hacer nada
    if (!this.data || this.data.length === 0) {
      this.paginatedData = [];
      return;
    }

    // Emitir evento de carga perezosa para obtener datos paginados
    this.onLazyLoad({
      first: this.currentPage * this.rowsPerPage,
      rows: this.rowsPerPage,
      sortField: null,
      sortOrder: this.sortOrder,
      filters: {},
    });
  }

  getTagColor(value: string): string {
    return this.columns.find(col => col.colorMap && col.colorMap[value])?.colorMap[value] || 'gray';
  }

  onLazyLoad(event: any) {
    // Emitir el evento para que el componente padre pueda manejar la paginación
    this.lazyLoad.emit(event);

    // Si no hay un manejador para el evento lazyLoad, realizar la paginación localmente
    if (this.lazyLoad.observed) {
      return;
    }

    // Paginación local
    const first = event.first || 0;
    const rows = event.rows || this.rowsPerPage;

    // Calcular el índice de inicio y fin para la página actual
    const startIndex = first;
    const endIndex = first + rows;

    // Obtener los datos para la página actual
    this.paginatedData = this.data.slice(startIndex, endIndex);
  }

  onPageChange(event: any) {
    this.currentPage = event.page;
    this.rowsPerPage = event.rows;
    const first = event.first ?? (this.currentPage * this.rowsPerPage);

    // Actualizar la paginación
    this.onLazyLoad({
      first,
      rows: this.rowsPerPage,
      sortField: null,
      sortOrder: this.sortOrder,
      filters: {},
    });
  }

  normalizeClass(value: string): string {
    if (!value) return '';

    return value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');
  }
}
