$(async () => {
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

  const data = await fetch('./all.json')
    .then((res) => res.json())
    .catch(() => {
      throw 'Data loading error'
    })

  const getItemPrices = () => {
    return data.reduce((set, store) => {
      store.items.forEach((itm) => {
        set[itm.name] = [...(set[itm.name] || []), itm.price]
      })
      return set
    }, {})
  }

  const itemPrices = getItemPrices()

  const getCategories = () => {
    return data.reduce((set, store) => {
      store.items.forEach((itm) => {
        itm.categories.forEach((c) => {
          set[c] = new Set([...(set[c] || []), itm.name])
        })
      })
      return set
    }, {})
  }

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
        name: itm.name,
        // width: 120,
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
    load: function() {
      return data
    },
  })

  let viewingStore

  const popupContentTemplate = (contentElement) => {
    const selectedCat = new Set(categoryNames)

    const getData = () => {
      return viewingStore.items
        .map((itm) => {
          const prices = itemPrices[itm.name]
          const average = prices.reduce((p, c) => p + c, 0) / prices.length
          return { ...itm, average, rel: (itm.price - average) / itm.price }
        })
        .filter((itm) => itm.categories.some((c) => selectedCat.has(c)))
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
      gridInstance,
      selectedCat,
      true,
      () => gridInstance.option('dataSource', getData()),
      () => gridInstance.option('dataSource', getData())
    )
  }

  const popup = $('#popup')
    .dxPopup({
      contentTemplate: (contentElement) => popupContentTemplate(contentElement),
      width: 600,
      container: '.dx-viewport',
      showTitle: true,
      title: 'Store Details',
      visible: false,
      dragEnabled: false,
      closeOnOutsideClick: false,
      showCloseButton: true,
      onHidden() {
        // viewingStore = undefined
      },
      position: {
        at: 'center',
        my: 'center',
      },
    })
    .dxPopup('instance')

  var dataGrid = $('#gridContainer')
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
          viewingStore = e.row.data
          popup.option({
            title: `Details: ${viewingStore.store.name}`,
            contentTemplate: (contentElement) =>
              popupContentTemplate(contentElement),
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

  const categories = getCategories()
  const categoryNames = [...Object.keys(categories)]
  const selectedCategories = new Set(categoryNames)

  let searchValue = ''

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

  const addButtons = (
    destContainer = '#controls',
    idPrefix = 'cb',
    grid = dataGrid,
    selectedCat = selectedCategories,
    allSelected = true,
    selectCb = undefined,
    selectAllCb = undefined
  ) => {
    $(destContainer).html('')

    let container = $('<div>')
    $('<input />', {
      type: 'checkbox',
      id: `${idPrefix}-all`,
      value: 'Show All',
      checked: allSelected,
      change: (e) => {
        const selected = e.target.checked
        if (!selected) {
          selectedCat.clear()
        } else {
          Object.keys(categories).forEach((c) => selectedCat.add(c))
        }

        if (selectAllCb) {
          selectAllCb(selected)
        } else {
          grid.beginUpdate()
          Object.values(categories).forEach((itm) => {
            itm.forEach((i) => grid.columnOption(i, 'visible', selected))
          })
          filterItemsByName(searchValue)
          grid.endUpdate()
        }
        addButtons(
          destContainer,
          idPrefix,
          grid,
          selectedCat,
          selected,
          selectCb,
          selectAllCb
        )
      },
    }).appendTo(container)
    $('<label />', { for: `${idPrefix}-all`, text: 'Show All' }).appendTo(
      container
    )
    $(destContainer).append(container)

    Object.keys(categories).forEach((category) => {
      const id =
        idPrefix + '-' + category.replace(/\s/g, '-').replace('&', 'and')
      let container = $('<div>')
      let label = $('<label />', { for: id })
      $('<input />', {
        type: 'checkbox',
        id: id,
        value: category,
        checked: selectedCat.has(category),
        change: (e) => {
          const selected = e.target.checked
          if (!selected) {
            selectedCat.delete(category)
          } else {
            selectedCat.add(category)
          }

          if (selectCb) {
            selectCb(category, selected)
          } else {
            const items = categories[category]
            grid.beginUpdate()
            items.forEach((itm) => {
              grid.columnOption(itm, 'visible', selected)
            })
            filterItemsByName(searchValue)
            grid.endUpdate()
          }
        },
      }).appendTo(label)
      label.append(category)
      label.appendTo(container)

      $(destContainer).append(container)
    })
  }

  const filterItems = $('<div />').dxTextBox({
    value: searchValue,
    showClearButton: true,
    placeholder: 'Search items...',
    valueChangeEvent: 'keyup',
    mode: 'search',
    onValueChanged: debounce((input) => {
      searchValue = input.value
      dataGrid.beginUpdate()
      filterItemsByName(
        searchValue,
        // reset if clearing name
        !input.value.trim() && input.previousValue !== input.value
      )
      dataGrid.endUpdate()
    }),
  })
  $('.dx-toolbar-after').append(filterItems)

  addButtons()
})
