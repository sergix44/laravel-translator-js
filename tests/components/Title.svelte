<script>
    import {__, trans_choice} from '../../src/svelte'
</script>

<h1 data-testid="title">{$__('Welcome!')}</h1>
<p data-testid="greeting">{$__('Welcome, :name!', {name: 'John'})}</p>
<p data-testid="cars">{$trans_choice('domain.car.car', 2)}</p>
