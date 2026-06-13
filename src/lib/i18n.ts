const translations: Record<string, Record<string, string>> = {
	vi: {
		// Navbar
		'nav.dashboard': 'Dashboard',
		'nav.accounts': 'Tài khoản',
		'nav.rankings': 'Xếp hạng',
		'nav.admin': 'Admin',
		'nav.logout': 'Thoát',

		// Admin tabs
		'admin.overview': 'Tổng quan',
		'admin.users': 'Users',
		'admin.import': 'Import',
		'admin.versions': 'Versions',
		'admin.scores': 'Scores',
		'admin.accounts': 'Accounts',

		// Login
		'login.title': 'Đăng nhập',
		'login.subtitle': 'ROK Manager',
		'login.username': 'Tên đăng nhập',
		'login.password': 'Mật khẩu',
		'login.submit': 'Đăng nhập',
		'login.loading': 'Đang xử lý...',

		// Dashboard
		'dash.title': 'Dashboard',
		'dash.noData': 'Chưa có dữ liệu.',
		'dash.noDataHint': 'Admin cần import dữ liệu và kích hoạt phiên bản.',
		'dash.mainAccount': 'Tài khoản chính',
		'dash.subAccounts': 'Tài khoản phụ',
		'dash.details': 'Chi tiết',

		// Rankings
		'rank.title': 'Xếp hạng',
		'rank.combined': 'Tổng hợp',
		'rank.individual': 'Cá nhân',
		'rank.name': 'Tên',
		'rank.dkp': 'DKP',
		'rank.noData': 'Chưa có dữ liệu.',
		'rank.players': 'người chơi',
		'rank.page': 'Trang',

		// Accounts (player)
		'acc.title': 'Quản lý tài khoản phụ',
		'acc.addTitle': 'Thêm tài khoản phụ',
		'acc.placeholder': 'Nhập Governor ID hoặc tên...',
		'acc.add': 'Thêm',
		'acc.addedSuccess': 'Đã thêm "{name}" thành công!',
		'acc.noSubs': 'Chưa có tài khoản phụ nào.',
		'acc.noSubsHint': 'Tìm kiếm bằng ID hoặc tên governor để thêm.',
		'acc.remove': 'Xóa',
		'acc.reportTitle': 'Báo cáo tranh chấp',
		'acc.reportDesc': 'Tài khoản {name} đã được người khác liên kết. Gửi báo cáo để Admin xem xét.',
		'acc.reportPlaceholder': 'Lý do bạn cho rằng đây là tài khoản của mình...',
		'acc.reportCancel': 'Hủy',
		'acc.reportSubmit': 'Gửi báo cáo',
		'acc.reportSent': 'Đã gửi báo cáo! Admin sẽ xem xét.',

		// Admin Panel
		'ap.title': 'Admin Panel',
		'ap.activeUsers': 'Users active',
		'ap.pendingInvites': 'Chờ kích hoạt',
		'ap.pendingReports': 'Báo cáo chờ',
		'ap.dataVersions': 'Phiên bản data',
		'ap.accountLinks': 'Account links',
		'ap.versionActive': 'Version active',
		'ap.noVersion': 'Chưa có',
		'ap.farmLinks': 'Liên kết Farm Account',
		'ap.mainAcc': 'Tài khoản chính',
		'ap.farmAcc': 'Farm Account',
		'ap.noLinks': 'Chưa có liên kết nào',
		'ap.user': 'User',
		'ap.recentUsers': 'Users gần đây',

		// Admin Users
		'au.title': 'Quản lý Users',
		'au.createTitle': 'Tạo user mới',
		'au.searchPlaceholder': 'Gõ tên hoặc Governor ID...',
		'au.createBtn': 'Tạo & lấy link',
		'au.inviteCreated': 'Invite link đã tạo:',
		'au.copy': 'Copy',
		'au.copied': 'Copied!',
		'au.copyLink': 'Copy link',
		'au.resetLink': 'Reset link',
		'au.deactivate': 'Vô hiệu',
		'au.notActivated': '(chưa kích hoạt)',
		'au.noUsers': 'Chưa có user nào.',
		'au.bonus': 'Bonus DKP',
		'au.bonusPct': 'Bonus %',
		'au.setBonus': 'Lưu',
		'au.bonusSaved': 'Đã cập nhật bonus!',
		'au.selected': 'Đã chọn:',

		// Admin Import
		'ai.title': 'Import Data',
		'ai.uploadTitle': 'Upload CSV',
		'ai.versionName': 'Tên phiên bản',
		'ai.versionPlaceholder': 'VD: KvK S3 - Tuần 4',
		'ai.fileLabel': 'File CSV',
		'ai.fileSelect': 'Click để chọn file CSV',
		'ai.importBtn': 'Import',
		'ai.importing': 'Đang import...',
		'ai.importSuccess': 'Import thành công! {count} người chơi đã được thêm vào phiên bản "{name}".',
		'ai.warnings': 'Cảnh báo',
		'ai.history': 'Lịch sử import',

		// Admin Versions
		'av.title': 'Quản lý phiên bản',
		'av.activated': 'Đã kích hoạt phiên bản mới!',
		'av.noVersions': 'Chưa có phiên bản nào.',
		'av.importLink': 'Import dữ liệu',
		'av.activate': 'Kích hoạt',

		// Admin Scores
		'as.title': 'Cấu hình & Tính điểm DKP',
		'as.configTitle': 'Cấu hình trọng số',
		'as.farmContrib': 'Farm đóng góp',
		'as.saved': 'Đã lưu & tính lại cho {count} người chơi!',
		'as.save': 'Lưu',
		'as.version': 'Phiên bản',
		'as.noVersion': 'Chưa có phiên bản active.',
		'as.activateLink': 'Kích hoạt một phiên bản',
		'as.calculated': 'Đã tính điểm cho {count} người chơi!',
		'as.calculating': 'Đang tính...',
		'as.calculate': 'Tính điểm',
		'as.recalculate': 'Tính lại điểm',

		// Admin Accounts
		'aa.title': 'Quản lý liên kết tài khoản',
		'aa.disputes': 'Báo cáo tranh chấp',
		'aa.reported': 'báo cáo Governor',
		'aa.accept': 'Chấp nhận',
		'aa.reject': 'Từ chối',
		'aa.allLinks': 'Tất cả liên kết',
		'aa.noLinks': 'Chưa có liên kết nào.',
		'aa.unlink': 'Xóa link',
		'aa.history': 'Lịch sử báo cáo',
		'aa.resolved': 'Đã xử lý',
		'aa.rejected': 'Từ chối',

		// Invite
		'inv.title': 'Kích hoạt tài khoản',
		'inv.welcome': 'Chào mừng!',
		'inv.activateFor': 'Kích hoạt tài khoản cho',
		'inv.confirmPassword': 'Xác nhận mật khẩu',
		'inv.activate': 'Kích hoạt tài khoản',

		// Common
		'lang.toggle': '🇬🇧 EN',
	},
	en: {
		'nav.dashboard': 'Dashboard',
		'nav.accounts': 'Accounts',
		'nav.rankings': 'Rankings',
		'nav.admin': 'Admin',
		'nav.logout': 'Logout',

		'admin.overview': 'Overview',
		'admin.users': 'Users',
		'admin.import': 'Import',
		'admin.versions': 'Versions',
		'admin.scores': 'Scores',
		'admin.accounts': 'Accounts',

		'login.title': 'Login',
		'login.subtitle': 'ROK Manager',
		'login.username': 'Username',
		'login.password': 'Password',
		'login.submit': 'Login',
		'login.loading': 'Loading...',

		'dash.title': 'Dashboard',
		'dash.noData': 'No data available.',
		'dash.noDataHint': 'Admin needs to import data and activate a version.',
		'dash.mainAccount': 'Main Account',
		'dash.subAccounts': 'Sub Accounts',
		'dash.details': 'Details',

		'rank.title': 'Rankings',
		'rank.combined': 'Combined',
		'rank.individual': 'Individual',
		'rank.name': 'Name',
		'rank.dkp': 'DKP',
		'rank.noData': 'No data available.',
		'rank.players': 'players',
		'rank.page': 'Page',

		'acc.title': 'Manage Sub Accounts',
		'acc.addTitle': 'Add Sub Account',
		'acc.placeholder': 'Enter Governor ID or name...',
		'acc.add': 'Add',
		'acc.addedSuccess': 'Added "{name}" successfully!',
		'acc.noSubs': 'No sub accounts yet.',
		'acc.noSubsHint': 'Search by ID or governor name to add.',
		'acc.remove': 'Remove',
		'acc.reportTitle': 'Dispute Report',
		'acc.reportDesc': 'Account {name} is already linked by another user. Submit a report for Admin review.',
		'acc.reportPlaceholder': 'Why you believe this is your account...',
		'acc.reportCancel': 'Cancel',
		'acc.reportSubmit': 'Submit Report',
		'acc.reportSent': 'Report submitted! Admin will review.',

		'ap.title': 'Admin Panel',
		'ap.activeUsers': 'Active users',
		'ap.pendingInvites': 'Pending invites',
		'ap.pendingReports': 'Pending reports',
		'ap.dataVersions': 'Data versions',
		'ap.accountLinks': 'Account links',
		'ap.versionActive': 'Active version',
		'ap.noVersion': 'None',
		'ap.farmLinks': 'Farm Account Links',
		'ap.mainAcc': 'Main Account',
		'ap.farmAcc': 'Farm Account',
		'ap.noLinks': 'No links yet',
		'ap.user': 'User',
		'ap.recentUsers': 'Recent users',

		'au.title': 'Manage Users',
		'au.createTitle': 'Create new user',
		'au.searchPlaceholder': 'Type name or Governor ID...',
		'au.createBtn': 'Create & get link',
		'au.inviteCreated': 'Invite link created:',
		'au.copy': 'Copy',
		'au.copied': 'Copied!',
		'au.copyLink': 'Copy link',
		'au.resetLink': 'Reset link',
		'au.deactivate': 'Deactivate',
		'au.notActivated': '(not activated)',
		'au.noUsers': 'No users yet.',
		'au.bonus': 'DKP Bonus',
		'au.bonusPct': 'Bonus %',
		'au.setBonus': 'Save',
		'au.bonusSaved': 'Bonus updated!',
		'au.selected': 'Selected:',

		'ai.title': 'Import Data',
		'ai.uploadTitle': 'Upload CSV',
		'ai.versionName': 'Version name',
		'ai.versionPlaceholder': 'E.g.: KvK S3 - Week 4',
		'ai.fileLabel': 'CSV File',
		'ai.fileSelect': 'Click to select CSV file',
		'ai.importBtn': 'Import',
		'ai.importing': 'Importing...',
		'ai.importSuccess': 'Import successful! {count} players added to version "{name}".',
		'ai.warnings': 'Warnings',
		'ai.history': 'Import history',

		'av.title': 'Manage Versions',
		'av.activated': 'New version activated!',
		'av.noVersions': 'No versions yet.',
		'av.importLink': 'Import data',
		'av.activate': 'Activate',

		'as.title': 'DKP Config & Scoring',
		'as.configTitle': 'Weight Configuration',
		'as.farmContrib': 'Farm contribution',
		'as.saved': 'Saved & recalculated for {count} players!',
		'as.save': 'Save',
		'as.version': 'Version',
		'as.noVersion': 'No active version.',
		'as.activateLink': 'Activate a version',
		'as.calculated': 'Calculated scores for {count} players!',
		'as.calculating': 'Calculating...',
		'as.calculate': 'Calculate',
		'as.recalculate': 'Recalculate',

		'aa.title': 'Manage Account Links',
		'aa.disputes': 'Dispute Reports',
		'aa.reported': 'reported Governor',
		'aa.accept': 'Accept',
		'aa.reject': 'Reject',
		'aa.allLinks': 'All Links',
		'aa.noLinks': 'No links yet.',
		'aa.unlink': 'Unlink',
		'aa.history': 'Report History',
		'aa.resolved': 'Resolved',
		'aa.rejected': 'Rejected',

		'inv.title': 'Activate Account',
		'inv.welcome': 'Welcome!',
		'inv.activateFor': 'Activate account for',
		'inv.confirmPassword': 'Confirm password',
		'inv.activate': 'Activate Account',

		'lang.toggle': '🇻🇳 VI',
	}
};

export type Lang = 'vi' | 'en';

export function t(lang: Lang, key: string, params?: Record<string, string | number>): string {
	let str = translations[lang]?.[key] ?? translations['vi']?.[key] ?? key;
	if (params) {
		for (const [k, v] of Object.entries(params)) {
			str = str.replace(`{${k}}`, String(v));
		}
	}
	return str;
}

export function getLang(cookieValue?: string): Lang {
	return cookieValue === 'en' ? 'en' : 'vi';
}
