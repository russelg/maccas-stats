const state = {
  searchValue: '',
  categories: {},
  itemPrices: {},
  selectedCategories: new Set(),
}

function setState(data) {
  state.categories = getCategories(data)
  state.selectedCategories = new Set([...Object.keys(state.categories)])
  state.itemPrices = getItemPrices(data)
}

function debounce(func, timeout = 300) {
  let timer
  return (...args) => {
    clearTimeout(timer)
    timer = setTimeout(() => {
      func.apply(this, args)
    }, timeout)
  }
}

const transformName = (name) => {
  return name
    .replace(' WA', '')
    .split(' ')
    .map((w) => w[0].toUpperCase() + w.substr(1).toLowerCase())
    .join(' ')
    .replace('Ii', '2')
}

const getCategories = (data) => {
  return data.reduce((set, store) => {
    store.items.forEach((itm) => {
      itm.categories.forEach((c) => {
        set[c] = new Set([...(set[c] || []), itm.name])
      })
    })
    return set
  }, {})
}

const getItemPrices = (data) => {
  return data.reduce((set, store) => {
    store.items.forEach((itm) => {
      set[itm.name] = [...(set[itm.name] || []), itm.price]
    })
    return set
  }, {})
}

const addButtons = (
  destContainer = '#controls',
  idPrefix = 'cb',
  selectCb = undefined,
  selectAllCb = undefined
) => {
  $(destContainer).html('')

  const catNames = Object.keys(state.categories)

  let container = $('<div>')
  $('<input />', {
    type: 'checkbox',
    id: `${idPrefix}-all`,
    value: 'Show All',
    checked: catNames.every((c) => state.selectedCategories.has(c)),
    change: (e) => {
      const selected = e.target.checked
      if (!selected) {
        state.selectedCategories.clear()
      } else {
        catNames.forEach((c) => state.selectedCategories.add(c))
      }

      if (selectAllCb) {
        selectAllCb(selected)
      }
      addButtons(destContainer, idPrefix, selectCb, selectAllCb)
    },
  }).appendTo(container)
  $('<label />', { for: `${idPrefix}-all`, text: 'Show All' }).appendTo(
    container
  )
  $(destContainer).append(container)

  catNames.forEach((category) => {
    const id = idPrefix + '-' + category.replace(/\s/g, '-').replace('&', 'and')
    let container = $('<div>')
    let label = $('<label />', { for: id })
    $('<input />', {
      type: 'checkbox',
      id: id,
      value: category,
      checked: state.selectedCategories.has(category),
      change: (e) => {
        const selected = e.target.checked
        if (!selected) {
          state.selectedCategories.delete(category)
        } else {
          state.selectedCategories.add(category)
        }

        if (selectCb) {
          selectCb(category, selected)
        }
      },
    }).appendTo(label)
    label.append(category)
    label.appendTo(container)

    $(destContainer).append(container)
  })
}

const popupContentTemplate = (store, contentElement) => {
  const itemPrices = state.itemPrices

  const getData = () => {
    return store.items
      .map((itm) => {
        const prices = itemPrices[itm.name]
        const average = prices.reduce((p, c) => p + c, 0) / prices.length
        return { ...itm, average, rel: (itm.price - average) / itm.price }
      })
      .filter((itm) =>
        itm.categories.some((c) => state.selectedCategories.has(c))
      )
  }

  const grid = $('<div id="popupGrid">').dxDataGrid({
    dataSource: getData(),
    keyExpr: 'name',
    searchPanel: {
      visible: true,
      placeholder: 'Search items...',
    },
    onCellPrepared(options) {
      const fieldData = options.value
      if (options.column.dataField === 'rel' && options.rowType === 'data') {
        options.cellElement.addClass(fieldData > 0 ? 'inc' : 'dec')
      }
    },
    showBorders: true,
    showRowLines: true,
    rowAlternationEnabled: true,
    columnAutoWidth: true,
    paging: {
      pageSize: 32,
      enabled: false,
    },
    sorting: {
      mode: 'single',
    },
    columns: [
      'name',
      {
        dataField: 'price',
        format: {
          precision: 2,
          type: 'currency',
        },
      },
      {
        caption: 'Diff.',
        dataField: 'rel',
        sortOrder: 'desc',
        allowSorting: true,
        format: {
          precision: 2,
          type: 'percent',
        },
      },
      {
        caption: 'State Avg.',
        dataField: 'average',
        format: {
          precision: 2,
          type: 'currency',
        },
      },
    ],
  })

  const buttons = $('<div id="popupControls" />')

  const wrapper = $('<div />').append(buttons, grid)

  contentElement.append(
    wrapper.dxScrollView({
      height: '100%',
      width: 'auto',
    })
  )

  const gridInstance = grid.dxDataGrid('instance')

  addButtons(
    buttons,
    'popup-cb',
    () => gridInstance.option('dataSource', getData()),
    () => gridInstance.option('dataSource', getData())
  )
}

const popup = $('#popup')
  .dxPopup({
    container: '.dx-viewport',
    showTitle: true,
    title: 'Store Details',
    visible: false,
    dragEnabled: false,
    closeOnOutsideClick: false,
    showCloseButton: true,
    position: {
      at: 'center',
      my: 'center',
    },
  })
  .dxPopup('instance')

let map

function initMap() {
  map = new google.maps.Map(document.getElementById('myMap'), {
    center: { lat: -24.840579, lng: 122.278334 },
    zoom: 5,
  })

  fetch('./all.json')
    .then((res) => res.json())
    .then((data) => {
      console.log(data)

      data.forEach((store) => {
        const loc = store.store.location
        const marker = new google.maps.Marker({
          position: { lat: loc.latitude, lng: loc.longitude },
          map,
          title: transformName(store.store.name),
        })
        marker.addListener('click', () => {
          console.log('clicked marker', store, popup)
          popup.option({
            title: `Details: ${store.store.name}`,
            contentTemplate: (contentElement) =>
              popupContentTemplate(store, contentElement),
          })
          popup.show()
        })
      })
    })
    .catch(() => {
      throw 'Data loading error'
    })
}

function GetMap() {
  const map = new Microsoft.Maps.Map('#myMap', {})

  map.setView({
    center: new Microsoft.Maps.Location(-24.840579, 122.278334),
    zoom: 5,
  })

  fetch('./all.json')
    .then((res) => res.json())
    .then((data) => {
      console.log(data)

      data.forEach((store) => {
        const loc = store.store.location
        const point = new Microsoft.Maps.Location(loc.latitude, loc.longitude)
        const pin = new Microsoft.Maps.Pushpin(point, {
          title: transformName(store.store.name),
        })
        map.entities.push(pin)
      })
    })
    .catch(() => {
      throw 'Data loading error'
    })

  //Generate a 1,000 random locations that are within the bounds of the map view.
  const locs = Microsoft.Maps.TestDataGenerator.getLocations(
    1000,
    map.getBounds()
  )

  //Load the HeatMap module.
  Microsoft.Maps.loadModule('Microsoft.Maps.HeatMap', function () {
    const heatmap = new Microsoft.Maps.HeatMapLayer(locs)
    map.layers.insert(heatmap)
  })
}

let previousActiveTabIndex = 0

$('.tabs-container').dxTabs({
  dataSource: [{ text: 'Grid' }, { text: 'Map (WIP)' }],
  selectedIndex: previousActiveTabIndex,
  onItemClick(e) {
    console.log(e)

    const items = $('.dx-multiview-item')
    if (e.itemIndex !== previousActiveTabIndex) {
      previousActiveTabIndex = e.itemIndex
      items.each(function (idx) {
        if (idx === previousActiveTabIndex) {
          // $(this).show()
          $(this).addClass('dx-item-selected')
        } else {
          // $(this).hide()
          $(this).removeClass('dx-item-selected')
        }
      })
    }
  },
})

$(async () => {
  const data = await fetch('./all.json')
    .then((res) => res.json())
    .catch(() => {
      throw 'Data loading error'
    })

  setState(data)

  const getColumns = () => {
    return [
      {
        caption: 'Store',
        fixed: true,
        columns: [
          {
            caption: 'Post',
            allowSorting: true,
            allowSearch: true,
            width: 48,
            calculateCellValue(data) {
              return data.store.address.postalZip
            },
            calculateSortValue(data) {
              return data.store.address.postalZip
            },
          },
          {
            caption: 'Name',
            alignment: 'right',
            sortOrder: 'asc',
            allowSorting: true,
            allowSearch: true,
            width: 200,
            calculateCellValue(data) {
              return transformName(data.store.name)
            },
            calculateSortValue(data) {
              return transformName(data.store.name)
            },
          },
        ],
      },
      ...data[0].items.map((itm) => ({
        caption: itm.name,
        name: itm.name, // width: 120,
        allowSorting: true,
        format: {
          precision: 2,
          type: 'currency',
        },
        calculateCellValue(data) {
          const foundItm = data.items.find((item) => item.name === itm.name)
          if (foundItm) return foundItm.price
          return 'N/A'
        },
        calculateSortValue(data) {
          const foundItm = data.items.find((item) => item.name === itm.name)
          if (foundItm) return foundItm.price
          return 'N/A'
        },
      })),
    ]
  }

  const store = new DevExpress.data.CustomStore({
    key: 'store.name',
    loadMode: 'raw', // omit in the DataGrid, TreeList, PivotGrid, and Scheduler
    load: function () {
      return data
    },
  })

  const dataGrid = $('#gridContainer')
    .dxDataGrid({
      dataSource: store,
      searchPanel: {
        visible: true,
        placeholder: 'Search stores...',
      },
      showBorders: true,
      showRowLines: true,
      rowAlternationEnabled: true,
      remoteOperations: false,
      focusedRowEnabled: true,
      onCellClick(e) {
        if (e.rowType === 'data') {
          const viewingStore = e.row.data
          popup.option({
            title: `Details: ${viewingStore.store.name}`,
            contentTemplate: (contentElement) =>
              popupContentTemplate(viewingStore, contentElement),
          })
          popup.show()
        }
      },
      paging: {
        pageSize: 32,
        enabled: true,
      },
      pager: {
        showPageSizeSelector: true,
        allowedPageSizes: [8, 16, 32, 48, 96],
      },
      columnAutoWidth: true,
      columns: getColumns(),
      sorting: {
        mode: 'single',
      },
    })
    .dxDataGrid('instance')

  const filterItemsByName = (name, reset = false) => {
    if (name || reset) {
      data[0].items.forEach((itm) => {
        dataGrid.columnOption(
          itm.name,
          'visible',
          reset ? true : itm.name.toLowerCase().includes(name.toLowerCase())
        )
      })
    }
  }

  const filterItems = $('<div />').dxTextBox({
    value: state.searchValue,
    showClearButton: true,
    placeholder: 'Search items...',
    valueChangeEvent: 'keyup',
    mode: 'search',
    onValueChanged: debounce((input) => {
      state.searchValue = input.value
      dataGrid.beginUpdate()
      filterItemsByName(
        state.searchValue, // reset if clearing name
        !input.value.trim() && input.previousValue !== input.value
      )
      dataGrid.endUpdate()
    }),
  })
  $('.dx-toolbar-after').append(filterItems)

  addButtons(
    '#controls',
    'cb',
    (category, selected) => {
      const items = state.categories[category]
      dataGrid.beginUpdate()
      items.forEach((itm) => {
        dataGrid.columnOption(itm, 'visible', selected)
      })
      filterItemsByName(state.searchValue)
      dataGrid.endUpdate()
    },
    (selected) => {
      dataGrid.beginUpdate()
      Object.values(state.categories).forEach((itm) => {
        itm.forEach((i) => dataGrid.columnOption(i, 'visible', selected))
      })
      filterItemsByName(state.searchValue)
      dataGrid.endUpdate()
    }
  )
})
