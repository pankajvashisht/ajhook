import React, { Fragment, useState } from 'react';
import { Card, CardHeader, CardBody, CardTitle } from 'reactstrap';
const UserDetails = (props) => {
	const [ userDetails ] = useState({ ...props.location.state.post });
	return (
		<Fragment>
			<Card>
				<CardHeader>
					<CardTitle tabIndex="10"> User Details </CardTitle>
				</CardHeader>
			</Card>
			<CardBody>
				<div>
					<b> Name </b> : {userDetails.name}
				</div>
				<hr />
				<div>
					<b> Email </b> : {userDetails.email}
				</div>
				<hr />
				<div>
				<b> Phone </b> : {userDetails.phone_code}{userDetails.phone}
				</div>
				<hr />
				<div>
					<b> Address </b> : {userDetails.address}
				</div>
				
				
				<hr />
			</CardBody>
		</Fragment>
	);
};

export default UserDetails;
