const data = [
	{
		id: 'dashboards',
		icon: 'iconsminds-shop-4',
		label: 'Dashboards',
		to: '/'
	},
	{
		id: 'Users',
		icon: 'simple-icon-people',
		label: 'Users',
		to: '/users',
		subs: [
			{
				icon: 'simple-icon-user',
				label: 'Users',
				to: '/users'
			},
		]
	},
	{
		id: 'Shops',
		icon: 'iconsminds-shop-2',
		label: 'Shops',
		to: '/shops',
		subs: [
			{
				icon: 'iconsminds-shop',
				label: 'Shops',
				to: '/shops'
			}
		]
	},
	{
		id: 'Driver',
		icon: 'iconsminds-bicycle',
		label: 'Drivers',
		to: '/drivers',
		subs: [
			{
				icon: 'iconsminds-bicycle',
				label: 'Drivers List',
				to: '/drivers'
			},
			{
				icon: 'simple-icon-location-pin',
				label: 'Map View',
				to: '/maps-drivers'
			}
		]
	},
	{
		id: 'Orders',
		icon: 'simple-icon-location-pin',
		label: 'Orders',
		to: '/orders',
		subs: [
			{
				icon: 'simple-icon-location-pin',
				label: 'Orders',
				to: '/orders'
			}
		]
	},
	{
		id: 'Push Notification',
		icon: 'simple-icon-bell',
		label: 'Push Notification',
		to: '/push'
	},
	{
		id: 'App Informations',
		icon: 'iconsminds-monitor---phone',
		label: 'App Informations',
		to: '/app-information'
	},

];
export default data;
