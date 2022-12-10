function findMember(members, nick) {
	const nickSearch = nick.toLowerCase();

	/** @type GuildMember */
	const member = members.find(
		(member) =>
			member.displayName.toLowerCase().includes(nickSearch) ||
			(member.nickname && member.nickname.toLowerCase().includes(nickSearch))
	);
	return member;
}

function arrayRandom(arr) {
	return arr[Math.floor(Math.random() * arr.length)];
}

module.exports = {
	findMember,
	arrayRandom,
};
